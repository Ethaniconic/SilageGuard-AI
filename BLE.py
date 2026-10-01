import asyncio
from bleak import BleakClient

CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"

def notification_handler(sender, data):
    raw_json = data.decode('utf-8')
    print(f"[RECEIVED]: {raw_json}")

async def main():
    # Replace with your ESP32's MAC Address or Name
    device_address = "XX:XX:XX:XX:XX:XX" 
    
    async with BleakClient(device_address) as client:
        print(f"Connected: {client.is_connected}")
        await client.start_notify(CHARACTERISTIC_UUID, notification_handler)
        await asyncio.sleep(60.0)  # Stream data for 60 seconds

asyncio.run(main())