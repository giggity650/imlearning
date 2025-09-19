"""Simple conversational learner that stores dialogues in JSON."""

from __future__ import annotations

import json
import random
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Sequence

# Regular expression to split text into word-like tokens while keeping punctuation.
_TOKEN_PATTERN = re.compile(r"[A-Za-z']+|\d+|[.,!?]")


@dataclass
class Message:
    """Represents a single utterance in the conversation log."""

    speaker: str
    text: str
    timestamp: str

    def as_dict(self) -> Dict[str, str]:
        return {"speaker": self.speaker, "text": self.text, "timestamp": self.timestamp}


class ConversationStore:
    """Handles loading and saving conversation history to a JSON file."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if self.path.exists():
            try:
                data = json.loads(self.path.read_text(encoding="utf-8"))
            except json.JSONDecodeError as exc:  # pragma: no cover - defensive branch
                raise ValueError(f"Conversation file {self.path} is not valid JSON") from exc
        else:
            data = {"messages": []}
            self._write(data)
        self._messages: List[Message] = [
            Message(**message) for message in data.get("messages", []) if _validate_message(message)
        ]

    @property
    def messages(self) -> Sequence[Message]:
        return tuple(self._messages)

    def append(self, speaker: str, text: str) -> Message:
        message = Message(speaker=speaker, text=text, timestamp=_current_timestamp())
        self._messages.append(message)
        self._write({"messages": [msg.as_dict() for msg in self._messages]})
        return message

    def _write(self, payload: Dict[str, Iterable[Dict[str, str]]]) -> None:
        self.path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


class MarkovChatbot:
    """A tiny chatbot that learns a Markov model from prior conversation."""

    def __init__(self, store: ConversationStore, seed: int | None = None) -> None:
        self.store = store
        self.random = random.Random(seed)

    def respond(self, user_text: str) -> str:
        user_text = user_text.strip()
        if not user_text:
            raise ValueError("Cannot learn from empty user input.")
        self.store.append("user", user_text)
        reply = self._generate_reply()
        self.store.append("bot", reply)
        return reply

    def _generate_reply(self) -> str:
        messages = self.store.messages
        tokens = [token for message in messages for token in _tokenize(message.text)]
        if len(tokens) < 16:
            return _gibberish(self.random)
        chain = _build_chain(tokens)
        return _compose_sentence(chain, tokens, self.random)


def _validate_message(message: Dict[str, str]) -> bool:
    return {
        "speaker",
        "text",
        "timestamp",
    }.issubset(message)


def _current_timestamp() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _tokenize(text: str) -> List[str]:
    return [match.group(0).lower() for match in _TOKEN_PATTERN.finditer(text)]


def _build_chain(tokens: Sequence[str]) -> Dict[str, List[str]]:
    transitions: Dict[str, List[str]] = {}
    for current, nxt in zip(tokens, tokens[1:]):
        transitions.setdefault(current, []).append(nxt)
    return transitions


def _compose_sentence(chain: Dict[str, List[str]], corpus_tokens: Sequence[str], rng: random.Random) -> str:
    if not corpus_tokens:
        return _gibberish(rng)
    start = rng.choice(corpus_tokens)
    length = rng.randint(6, 20)
    words = [start]
    for _ in range(length - 1):
        options = chain.get(words[-1])
        if not options:
            break
        words.append(rng.choice(options))
    sentence = _format_sentence(words)
    if sentence[-1] not in ".!?":
        sentence += "."
    return sentence


_GIBBERISH_SYLLABLES = [
    "za",
    "gru",
    "plo",
    "fen",
    "zib",
    "vor",
    "quar",
    "nib",
    "mal",
    "tre",
]


def _gibberish(rng: random.Random) -> str:
    word_count = rng.randint(3, 7)
    words = []
    for _ in range(word_count):
        syllables = rng.randint(2, 4)
        word = "".join(rng.choice(_GIBBERISH_SYLLABLES) for _ in range(syllables))
        words.append(word)
    sentence = " ".join(words)
    sentence = sentence.capitalize()
    sentence += rng.choice(["?", "!", "..."])
    return sentence


def _format_sentence(tokens: Sequence[str]) -> str:
    if not tokens:
        return ""
    sentence = tokens[0]
    for token in tokens[1:]:
        if token in {".", ",", "!", "?"}:
            sentence += token
        else:
            sentence += " " + token
    return sentence.capitalize()


__all__ = ["ConversationStore", "MarkovChatbot", "Message"]
