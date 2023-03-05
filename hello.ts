import * as fs from "fs";
import * as tf from "@tensorflow/tfjs-node"
import * as path from "path";
import {mod} from "@tensorflow/tfjs-node";
// import * as brain from "brain.js";
console.log("hello")
// fs.exists("./hello.ts", (e)=> console.log(e))
// // console.log(brain.NeuralNetwork)
//
// const HIDDEN_SIZE = 4
// const model = tf.sequential()
// const DATA = tf.tensor([
//     [2.0, 1.0],
//     [5.0, 1.0],
//     [7.0, 4.0],
//     [12.0, 5.0],
// ])
// model.add(
//     tf.layers.dense({
//         inputShape: [DATA.shape[1]],
//         units: HIDDEN_SIZE,
//         activation: "tanh",
//     })
// )
// model.add(
//     tf.layers.dense({
//         units: HIDDEN_SIZE,
//         activation: "tanh",
//     })
// )
// model.add(
//     tf.layers.dense({
//         units: 1,
//     })
// )
//
// model.summary()
// console.log(tf.getBackend());



async function f(){
    // Create a simple model.
    const model = tf.sequential();
    model.add(tf.layers.dense({units: 1, inputShape: [1]}));

// Prepare the model for training: Specify the loss and the optimizer.
    model.compile({loss: 'meanSquaredError', optimizer: 'sgd'});

// Generate some synthetic data for training. (y = 2x - 1)
    const xs = tf.tensor2d([-1, 0, 1, 2, 3, 4], [6, 1]);
    const ys = tf.tensor2d([-3, -1, 1, 3, 5, 7], [6, 1]);
    const history = await model.fit(xs, ys, {epochs: 250})

    const fileurl= 'file://./mod'
    await model.save(fileurl)
    const m = await tf.loadLayersModel("file://./mod/model.json")
    // @ts-ignore
    const p = m.predict(tf.tensor2d([20], [1, 1])).dataSync()[0]
    console.log(p)
    // @ts-ignore
    const p1 = model.predict(tf.tensor2d([20], [1, 1])).dataSync()[0]
    console.log(p1)

}

f()
