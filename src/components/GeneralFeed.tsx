import { INFINITE_SCROLL_PAGINATION_RESULTS } from "@/config";
import { db } from "@/lib/db";
import PostFeed from "./PostFeed";

async function GeneralFeed() {
  const posts = await db.post.findMany({
    orderBy: {
      createdAt: "desc",
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

export default GeneralFeed;
