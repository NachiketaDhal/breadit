import { INFINITE_SCROLL_PAGINATION_RESULTS } from "@/config";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import PostFeed from "./PostFeed";

async function CustomFeed() {
  const session = await getAuthSession();

  const followedCommunities = await db.subscription.findMany({
    where: {
      userId: session?.user.id,
    },
    include: {
      subreddit: true,
    },
  });

  const posts = await db.post.findMany({
    orderBy: {
      createdAt: "desc",
    },
    where: {
      subreddit: {
        id: {
          in: followedCommunities.map((com) => com.subredditId),
        },
      },
    },
    include: {
      author: true,
      comments: true,
      subreddit: true,
      votes: true,
    },
    take: INFINITE_SCROLL_PAGINATION_RESULTS,
  });
  return <PostFeed initialPosts={posts} />;
}

export default CustomFeed;
