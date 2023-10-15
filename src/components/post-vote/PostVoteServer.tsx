import { getAuthSession } from "@/lib/auth";
import { Post, Vote, VoteType } from "@prisma/client";
import PostVoteClient from "./PostVoteClient";

interface PostVoteServerProps {
  postId: string;
  initialVoteAmt?: number;
  initialVote?: VoteType | undefined;
  getData?: () => Promise<(Post & { votes: Vote[] }) | null>;
}

async function PostVoteServer({
  postId,
  initialVoteAmt,
  initialVote,
  getData,
}: PostVoteServerProps) {
  const session = await getAuthSession();

  let _votesAmt: number = 0;
  let _currentVote: VoteType | undefined = undefined;

  if (getData) {
    const post = await getData();

    _votesAmt =
      post?.votes.reduce((acc, curr) => {
        if (curr.type === "DOWN") return acc - 1;
        if (curr.type === "UP") return acc + 1;
        return acc;
      }, 0) ?? 0;

    _currentVote = post?.votes.find(
      (vote) => vote.userId === session?.user.id
    )?.type;
  } else {
    _votesAmt = initialVoteAmt ?? 0;
    _currentVote = initialVote;
  }

  return (
    <PostVoteClient
      initialVote={_currentVote}
      initialVotesAmt={_votesAmt}
      postId={postId}
    />
  );
}

export default PostVoteServer;
