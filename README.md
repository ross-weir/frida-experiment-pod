## README

Throw-away project experimenting with the Frida reverse engineering framework.

## What I would do different

Instead of using python do initialize a frida session, use the TypeScript bindings. Use only one language instead of maintaining 2 sets of dependencies.

## Conclusion

It would be useful for initial research, recon of a target and exploit research.

I wanted to see if it could be used as the base of a exploit framework but it looks unsuitable.

FFI has serious performance considerations. Intercepting "hot" functions (functions called often) need special attention.
For example, intercepting lots of network traffic is not really practical using Frida.

The API is quite verbose and I found working with native structures to be awkawrd.