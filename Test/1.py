import asyncio, websockets, json
async def run():
    uri = "ws://localhost:8000/ws/chat/general/?token=<TOKEN>"
    try:
        async with websockets.connect(uri) as ws:
            await ws.send(json.dumps({"message":"hello from test","username":"tester"}))
            print("sent, waiting reply...")
            print(await ws.recv())
    except Exception as e:
        print("WS failed:", e)
asyncio.run(run())