import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { postVoteValidator } from "@/lib/validators/vote";
import { CachedPost } from "@/types/redis";
import { z } from "zod";

export async function PATCH(req: Request) {
  try {
    const CACHE_AFTER_UPVOTES = 1;
    const body = await req.json();

    const session = await getAuthSession();

    const { postId, voteType } = postVoteValidator.parse(body);

    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check if the user has already voted
    const exisitingVote = await db.vote.findFirst({
      where: {
        postId,
        userId: session?.user.id,
      },
    });

    const post = await db.post.findUnique({
      where: {
        id: postId,
      },
      include: {
        author: true,
        votes: true,
      },
    });

    if (!post) {
      return new Response("Post not found", { status: 404 });
    }

    if (exisitingVote) {
      // if vote type is the same as existing vote, delete the vote
      if (exisitingVote.type === voteType) {
        await db.vote.delete({
          where: {
            userId_postId: {
              postId,
              userId: session.user.id,
            },
          },
        });
        return new Response("OK");
      } else {
        // if vote type is different, update the vote
        await db.vote.update({
          where: {
            userId_postId: {
              postId,
              userId: session.user.id,
            },
          },
          data: {
            type: voteType,
          },
        });

        // Recount the votes
        const votesAmt = post.votes.reduce((prev, curr) => {
          if (curr.type === "UP") return prev + 1;
          if (curr.type === "DOWN") return prev - 1;
          return prev;
        }, 0);

        if (votesAmt >= CACHE_AFTER_UPVOTES) {
          const cachePayload: CachedPost = {
            authorUsername: post.author.userName ?? "",
            content: JSON.stringify(post.content),
            id: post.id,
            title: post.title,
            currentVote: voteType,
            createdAt: post.createdAt,
          };

          await redis.hset(`post:${postId}`, cachePayload); // Store the post data as a hash
        }
        return new Response("OK");
      }
    }
    await db.vote.create({
      data: {
        type: voteType,
        postId,
        userId: session.user.id,
      },
    });

    // Recount the votes
    const votesAmt = post.votes.reduce((prev, curr) => {
      if (curr.type === "UP") return prev + 1;
      if (curr.type === "DOWN") return prev - 1;
      return prev;
    }, 0);

    if (votesAmt >= CACHE_AFTER_UPVOTES) {
      const cachePayload: CachedPost = {
        authorUsername: post.author.userName ?? "",
        content: JSON.stringify(post.content),
        id: post.id,
        title: post.title,
        currentVote: voteType,
        createdAt: post.createdAt,
      };

      await redis.hset(`post:${postId}`, cachePayload); // Store the post data as a hash
    }

    return new Response("OK");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(error.message, { status: 400 });
    }

    return new Response(
      "Could not post to subreddit at this time. Please try later",
      { status: 500 }
    );
  }
}
