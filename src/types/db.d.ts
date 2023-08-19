import { Post } from "@prisma/client";

export type ExtendedPost = Post & {
  author: User;
  votes: Vote[];
  comments: Comment[];
  subreddit: Subreddit;
};
