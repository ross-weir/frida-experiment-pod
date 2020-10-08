
// Allow opening multiple Diablo II processes by removing the check for already existing "Diablo II" windows.
Interceptor.attach(Module.getExportByName('user32.dll', 'FindWindowA'), {
  onEnter(args) {
    this.windowStr = args[0].readCString()
  },
  onLeave(retval) {
    if (this.windowStr === 'Diablo II') {
      retval.replace(ptr('0x0'))
    }
  }
})

const batchSend = () => {
  const batchedMsgs: any[] = []

  return (msg: any) => {
    batchedMsgs.push(msg)

    if (batchedMsgs.length > 5) {
      send({msgs: batchedMsgs})
      batchedMsgs.length = 0
    }
  }
}
const batchedSend = batchSend()

let d2NetModule
// Ordinal#10015 - Send network packet GameServer
const sendMsgToSrvOffset = 0x6F20
let d2ClientModule
// Ordinal#10001 - Recv network packet GameServer
const recvMsgFromSrvOffset = 0x6020

let nativeRecvMsgFromGS: NativeFunction
let nativeSendMsgToGS: NativeFunction

// d2net.dll module isn't always loaded on process startup.
// Check for the module every 500ms and then remove the timer when we have loaded the module and intercepted the functions.
const netModuleTimer = setInterval(() => {
  d2NetModule = Process.getModuleByName('d2net.dll')

  if (!d2NetModule) {
    return
  }

  clearInterval(netModuleTimer)

  nativeSendMsgToGS = new NativeFunction(d2NetModule.base.add(sendMsgToSrvOffset), 'int', ['int', 'int', 'pointer'], 'stdcall')

  Interceptor.attach(d2NetModule.base.add(sendMsgToSrvOffset), {
    onEnter(args) {
      // bad for performance since this is a hot intercept, batch sending in future.
      send({action: 'send', id: args[2].readU8().toString(16), size: args[0].toInt32(), dump: hexdump(args[2], {
        offset: 0,
          length: args[0].toInt32(),
          header: true,
          ansi: true
      })})
    }
  })

  nativeRecvMsgFromGS = new NativeFunction(d2NetModule.base.add(recvMsgFromSrvOffset), 'int', ['pointer', 'int'], 'fastcall')

  Interceptor.attach(d2NetModule.base.add(recvMsgFromSrvOffset), {
    onEnter(args) {
      const ctx = this.context as Ia32CpuContext
      const msgPtr = ctx.ecx
      const size = ctx.edx.toInt32()
      
      // bad for performance since this is a hot intercept, batch sending in future.
      send({action: 'recv', id: msgPtr.readU8().toString(16), size: size, dump: hexdump(msgPtr, {
        offset: 0,
          length: size,
          header: true,
          ansi: true
      })})
    }
  })
}, 500)

const packetStruct = Memory.alloc(0x4)

// recv: 77 0c to spoof trade close
rpc.exports = {
  // Send a packet to the GameServer.
  send(size, unknown1, byteArr) {
    if (!nativeSendMsgToGS) {
      return
    }

    // Send packet function.
    const fn = new NativeFunction(Process.getModuleByName('d2net.dll').base.add(sendMsgToSrvOffset), 'int', ['int', 'int', 'pointer'], 'stdcall')

    // let packetStructOffset = packetStruct
    // for (let i = 0; i < size; i++) {
    //   packetStruct.writeU8(byteArr[i])
    //   packetStructOffset = packetStructOffset.add(0x1)
    // }
    packetStruct.writeU8(0x69)
    console.log(packetStruct, nativeSendMsgToGS)

    Memory.protect(packetStruct, 0x4, 'rw-')

    fn(1, 0, packetStruct)

    // try {
    //   nativeSendMsgToGS(1, 1, packetStruct)
    // } catch (e) {
    //   console.log(e.toString())
    // }
    //
    return true
  },
  recvGs(byteStr, size) {
    if (!nativeRecvMsgFromGS) {
      return
    }

    nativeRecvMsgFromGS(byteStr, size)
  },
}
