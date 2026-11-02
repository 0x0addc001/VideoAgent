import json
import sys


def main() -> int:
    args = sys.argv[1:]
    command = args[0] if args else ""
    if command == "status":
        print(json.dumps({"logged_in": True, "source": "test"}))
        return 0
    if command == "get-credit-balance":
        print(json.dumps({"total_remain_amount": "42"}))
        return 0
    if command == "generate-video":
        print(
            json.dumps(
                {
                    "thread_id": "thread-test-1",
                    "run_id": "run-test-1",
                    "web_thread_link": "https://example.com/threads/thread-test-1",
                }
            )
        )
        return 0
    if command == "query-result":
        print(
            json.dumps(
                {
                    "completed": True,
                    "videos": [
                        {
                            "download_url": "https://media.example.com/pippit/video.mp4",
                            "output_path": "video.mp4",
                        }
                    ],
                }
            )
        )
        return 0
    print(json.dumps({"error": f"unexpected command: {command}"}), file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
