import { VoteType } from "@prisma/client";
import { Button } from "../ui/Button";
import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { usePrevious } from "@mantine/hooks";
import { useCustomToasts } from "@/hooks/use-custom-toast";
import { useMutation } from "@tanstack/react-query";
import { postVoteRequest } from "@/lib/validators/vote";
import axios, { AxiosError } from "axios";
import { toast } from "@/hooks/use-toast";

interface PostVoteClientProps {
  postId: string;
  initialVotesAmt: number;
  initialVote: VoteType | undefined;
}

function PostVoteClient({
  initialVote,
  initialVotesAmt,
  postId,
}: PostVoteClientProps) {
  const { loginToast } = useCustomToasts();
  const [votesAmt, setVotesAmt] = useState(initialVotesAmt);
  const [currentVote, setCurrentVote] = useState(initialVote);
  const prevVote = usePrevious(currentVote);

  useEffect(() => {
    setVotesAmt(initialVotesAmt);
  }, [initialVotesAmt]);

  useEffect(() => {
    setCurrentVote(initialVote);
  }, [initialVote]);

  const { mutate: vote, isLoading } = useMutation({
    mutationFn: async (voteType: VoteType) => {
      const payload: postVoteRequest = {
        postId,
        voteType,
      };

      await axios.patch("/api/subreddit/post/vote", payload);
    },
    onError: (error, type: VoteType) => {
      if (type === "UP") setVotesAmt((prev) => prev - 1);
      if (type === "DOWN") setVotesAmt((prev) => prev + 1);

      // Reset to prev vote
      setCurrentVote(prevVote);

      if (error instanceof AxiosError) {
        if (error.response?.status === 401) return loginToast();
      }

      return toast({
        title: "Something went wrong.",
        description: "Your vote was not registered. Please try again.",
        variant: "destructive",
      });
    },
    onMutate: (type: VoteType) => {
      if (type === currentVote) {
        // If we are doing upvote and the post is already upvoted(same incase of downvote)
        // Just undo
        setCurrentVote(undefined);
        if (type === "UP") setVotesAmt((prev) => prev - 1);
        if (type === "DOWN") setVotesAmt((prev) => prev + 1);
      } else {
        // If we are doing upvote and the post is downvoted(viceversa)
        // No vote case will also be considered(currentVote is null)
        setCurrentVote(type);
        const requiredCount = currentVote ? 2 : 1; // When currentVote is null count should be 1 otherwise 2
        if (type === "UP") setVotesAmt((prev) => prev + requiredCount);
        if (type === "DOWN") setVotesAmt((prev) => prev - requiredCount);
      }
    },
  });

  return (
    <div className="flex flex-col gap-4 pb-4 pr-6 sm:gap-0 sm:w-20 sm:pb-0">
      {/* upvote */}
      <Button
        onClick={() => vote("UP")}
        size="sm"
        variant="ghost"
        aria-label="upvote"
        disabled={isLoading}
      >
        <ArrowBigUp
          className={cn("h-5 w-5 text-zinc-700", {
            "text-emerald-500 fill-emerald-500": currentVote === "UP",
          })}
        />
      </Button>

      {/* score */}
      <p className="py-2 text-sm font-medium text-center text-zinc-900">
        {votesAmt}
      </p>

      {/* downvote */}
      <Button
        onClick={() => vote("DOWN")}
        size="sm"
        className={cn({
          "text-emerald-500": currentVote === "DOWN",
        })}
        variant="ghost"
        aria-label="downvote"
        disabled={isLoading}
      >
        <ArrowBigDown
          className={cn("h-5 w-5 text-zinc-700", {
            "text-red-500 fill-red-500": currentVote === "DOWN",
          })}
        />
      </Button>
    </div>
  );
}

export default PostVoteClient;
