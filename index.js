const { MongoClient } = require('mongodb');
const express = require('express');
const stripe = require('stripe')('sk_test_51K93ltBcGooWtax9GkAGLr4DEmlZNpm6tUa0SLImClKgGZFpYehHv9XhvOAf5escrbFzko1UJ1bbecG02hdCCZZu00K0yXRB8H');
const port = process.env.PORT || 5000;
const ObjectId = require('mongodb').ObjectId;
const fileUpload = require('express-fileupload');
const app = express();
const cors = require('cors');

require('dotenv').config();

app.use(cors());
app.use(express.json());
app.use(fileUpload());




async function run() {

    // mongo db uri

    const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.39aol.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });



    try {

        await client.connect();
        const database = client.db('cycleLife');
        const cycleCollection = database.collection('cycles');
        const cartCollection = database.collection('cartProducts');
        const reivewCollection = database.collection('user-review');
        const usersCollection = database.collection('users');

        // get products api
        app.get('/cycles', async (req, res) => {
            const cursor = cycleCollection.find({})
            const page = req.query.page;
            console.log(req.query)
            const size = parseInt(req.query.size);
            let products;
            const count = await cursor.count();
            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();
            }
            else {
                products = await cursor.toArray();
            }

            res.send({
                count,
                products,

            });
        });

        // get single product api
        app.get('/cycles/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const singleProduct = await cycleCollection.findOne(query);
            res.send(singleProduct);
        });

        // add product on cart
        app.post('/addToCart', async (req, res) => {
            const product = req.body;
            const addProduct = await cartCollection.insertOne(product);
            res.send(addProduct);
        });

        // get cart all product
        app.get('/cartProducts', async (req, res) => {
            res.send(await cartCollection.find({}).toArray());
        });

        // set payment status
        app.put('/cartProducts/:email', async (req, res) => {
            const email = req.params.email;
            const payment = req.body;
            const filter = { email: email };
            const updateDoc = {
                $set: {
                    payment: payment
                }
            };
            const result = await cartCollection.updateMany(filter, updateDoc);
            res.json(result);
        })

        // get cart product with email
        app.get('/myCart/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        });

        // delete cart api
        app.delete('/myCart/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await cartCollection.deleteOne(query);
            res.json(result);
        });

        // get user review
        app.get('/review', async (req, res) => {
            res.send(await reivewCollection.find({}).toArray());
        });

        // post user review
        app.post('/addReview', async (req, res) => {
            const review = req.body;
            res.send(await reivewCollection.insertOne(review));
        });

        // update status
        app.put('/updateStatus/:id', async (req, res) => {
            const id = req.params.id;
            const updateStatus = req.body.status;
            const filter = { _id: ObjectId(id) };
            const result = await cartCollection.updateOne(filter, {
                $set: { status: updateStatus },
            });
            res.send(result);
        });

        // saver user
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // save user google sign
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        // make admin 
        app.put('/users/admin', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const updateDoc = { $set: { role: "admin" } };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.json(result);
        });

        // get admin status
        app.get('/users/:email', async (req, res) => {
            const user = await usersCollection.findOne({ email: req.params.email });
            let Admin = false;
            if (user?.role === 'admin') {
                Admin = true;
            };
            res.json({ Admin: Admin });
        });

        // post cycle 
        app.post('/addCycle', async (req, res) => {
            const name = req.body.name;
            const pic = req.files.image;
            const picData = pic.data;
            const encodedPic = picData.toString('base64');
            const imageBuffer = Buffer.from(encodedPic, 'base64');
            const cycle = {
                name,
                image: imageBuffer
            };
            const result = await cycleCollection.insertOne(cycle);
            res.json(result);
        });

        // stripe payment gatway
        app.post('/createPayment', async (req, res) => {
            const paymentInfo = req.body;
            const amount = paymentInfo.price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                payment_method_types: ['card']
            });
            res.json({ clientSecret: paymentIntent.client_secret })
        })
    }

    finally {

    }
};

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Cycle life passion with cycle');
})

app.listen(port, () => {
    console.log(`My server is running ${port}`);
})