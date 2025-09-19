"""Command line chat interface for the Markov chatbot."""

from __future__ import annotations

import argparse
from pathlib import Path

from src.learner import ConversationStore, MarkovChatbot


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Interact with the improvised language learner.")
    parser.add_argument(
        "--data",
        type=Path,
        default=Path("data/conversations.json"),
        help="Path to the JSON file where the conversation history is stored.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Optional random seed to make the bot deterministic for testing.",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    store = ConversationStore(args.data)
    bot = MarkovChatbot(store, seed=args.seed)

    print("Welcome to the improvised language learner!")
    print("Type '/quit' or press Ctrl+D to exit.\n")

    while True:
        try:
            user_input = input("You: ")
        except EOFError:
            print()  # newline after Ctrl+D
            break
        except KeyboardInterrupt:
            print("\nGoodbye!")
            return

        if user_input.strip().lower() in {"/quit", "quit", "exit"}:
            break
        if not user_input.strip():
            continue

        try:
            response = bot.respond(user_input)
        except ValueError as exc:
            print(f"[error] {exc}")
            continue
        print(f"Bot: {response}")

    print(f"Conversation saved to {args.data}")


if __name__ == "__main__":
    main()
