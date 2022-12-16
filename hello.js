console.log("HI")
console.log("HI")

async function *f(){
    yield 1
    yield 2
}

async function m() {
    for  (let c of f()) {
        c = await c
        console.log(c)

    }
}

m().then(()=>console.log("DONE"))