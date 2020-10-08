"""
Helper to load frida, run main.js and display script output.
"""

import argparse
import sys

import frida


default_proc_name = "Game.exe"
default_exe_path = "D:\\Games\\PoD-fresh\\Path of Diablo"
device = frida.get_local_device()


def on_spoof_77_cmd(cmd, script):
    msg = b""
    script.exports.recvGs(2, 0, msg)


def on_leave_cmd(cmd, script):
    script.exports.send(1, 0, [0x69])


def handle_cmd(cmd, script):
    cmd_map = {
        "1": on_spoof_77_cmd,
        "leave": on_leave_cmd,
    }

    cmd_map[cmd](cmd, script)


def on_message(message, data):
    if message["type"] == "send":
        if isinstance(message["payload"], dict):
            pass
        else:
            print(message["payload"])
        try:
            hexdump = message["payload"].pop("dump", None)
        except AttributeError:
            hexdump = None
        if hexdump:
            print(hexdump)
        if data:
            displayable_data = ""
            for b in data:
                displayable_data += "%02x" % b
            print(f"data: {displayable_data}")
        print("==============")


def init_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pid", nargs="?", help="Attach to pid if supplied")
    parser.add_argument("--exe", nargs="?", help="Path to an executable to spawn", default=f"{default_exe_path}\\Game.exe")
    parser.add_argument("--find_proc", nargs="?", help="Find and attach to existing process with the name 'Game.exe'", type=bool, default=False)
    args = parser.parse_args()
    return args


def main():
    args = init_args()
    resume_proc = not args.pid
    if args.find_proc:
        pid = device.get_process(default_proc_name).pid
        resume_proc = False
    else:
        pid = args.pid or frida.spawn([args.exe, "-w"], cwd=default_exe_path)
    session = frida.attach(int(pid))
    session.enable_debugger()
    with open("main.js", "r") as f:
        script = session.create_script(f.read())
    script.on("message", on_message)
    script.load()
    if resume_proc:
        frida.resume(pid)
    while True:
        cmd = sys.stdin.read()
        if cmd:
            handle_cmd(cmd.rstrip(), script)


if __name__ == "__main__":
    main()
