# Improvised Language Learner

This project contains a deliberately simple AI that starts by babbling
nonsense and gradually learns from every human interaction it records. All
conversations are stored in `data/conversations.json`, so history is versioned
alongside the code.

Two interfaces are included:

- **Terminal chat (`python chat.py`)** – talk to the learner locally. Every
  message is appended to the JSON log.
- **GitHub Pages chat (`docs/index.html`)** – host a lightweight web UI that can
  fetch and update the same conversation file through the GitHub REST API.

## Getting started

1. Install Python 3.9+.
2. Create a virtual environment (optional) and install requirements (none are
   needed beyond the standard library).
3. Run the CLI: `python chat.py`.
4. Type messages. The bot will reply using a Markov chain built from the stored
   history. Type `/quit` or press <kbd>Ctrl</kbd>+<kbd>D</kbd> to exit.

### Conversation log format

`data/conversations.json` is a UTF-8 JSON file with a single key `messages`
containing an array of objects:

```json
{
  "speaker": "user" | "bot",
  "text": "Message text",
  "timestamp": "ISO-8601 UTC timestamp"
}
```

The CLI and web UI both append to this list.

## Deploying the web UI to GitHub Pages

1. Commit the repository to GitHub.
2. In repository settings, enable GitHub Pages and select the `docs/` folder.
3. Visit the published site. Use the “Connect your repository” form to enter
   the repository details and a personal access token with **contents:write**
   scope (fine-grained tokens recommended).
4. Start chatting! Every message triggers a GitHub API call that commits the
   updated `data/conversations.json` back to the repository.

> ⚠️ Never share or commit your personal access token. Users should supply
> their own token when interacting with the hosted site.

## Architecture overview

- `src/learner.py` implements a small Markov-chain chatbot plus a
  `ConversationStore` helper that reads/writes the JSON log.
- `chat.py` offers a terminal interface that appends messages to the log.
- `docs/` contains a static site (HTML/CSS/JS). The JavaScript re-implements the
  same Markov logic in the browser and uses the GitHub REST API to load and
  update the log file.

## Development tips

- The learner starts with gibberish until it sees enough tokens (16+) to model
  English-like responses. Encourage friends to talk to it to improve its
  vocabulary.
- Use `--seed` when running `chat.py` if you want deterministic responses for
  demos or tests.
- Since every interaction is versioned, you can review conversation diffs and
  roll back if necessary.
