
const express = require('express');
const app = express();
const cors = require('cors');
// const jwt = require('jsonwebtoken');




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nprvrf8.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("parcelDB").collection("users");
    const orderCollection = client.db("parcelDB").collection("order");

    // const verifyAdmin = async (req, res, next) => {
    //     const email = req.decoded.email;
    //     const query = {email: email };
    //     const user = await usersCollection.findOne(query);
    //     const isAdmin =  user?.role === 'admin';
    //     if(!isAdmin){
    //       return res.status(403).send({message: 'forbidden-access'});
    //     }
    //     next();
    //   }

      app.get('/users/admin/:email',   async(req, res) => {
        const email = req.params.email;
        if(email !== req.decoded.email ) {
         return res.status(403).send({message: "uinauthorized access"})
        }
        const query = {email : email};
        const user = await usersCollection.findOne(query);
        const admin = false; 
        if(user){
          admin = user?.role === 'admin';
        }
        res.send({admin});
      })

      app.get('/users/deliveryMan/:email',   async(req, res) => {
        const email = req.params.email;
        if(email !== req.decoded.email ) {
         return res.status(403).send({message: "uinauthorized access"})
        }
        const query = {email : email};
        const user = await usersCollection.findOne(query);
        const deliveryMan = false; 
        if(user){
            deliveryMan = user?.role === 'deliveryMan';
        }
        res.send({deliveryMan});
      })

      app.get('/delivery-men', async (req, res) => {
        
          const deliveryMen = await usersCollection.find({ role: 'deliveryMan' }).toArray();
          res.send(deliveryMen);
        
      });

    //   app.get('/users/admin/:email',   async(req, res) => {
    //     const email = req.params.email;
    //     if(email !== req.decoded.email ) {
    //      return res.status(403).send({message: "uinauthorized access"})
    //     }
    //     const query = {email : email};
    //     const user = await usersCollection.findOne(query);
    //     const admin = false; 
    //     if(user){
    //       admin = user?.role === 'admin';
    //     }
    //     res.send({admin});
    //   })

    // app.patch('/users/admin/:id',    async(req, res) => {
    //     const id = req.params.id;
    //     const filter = {_id: new ObjectId(id)};
    //     const updatedDoc = {
    //       $set: {
    //         role: 'admin'
    //       }
    //     }
    //     const result = await usersCollection.updateOne(filter, updatedDoc);
    //     res.send(result);
    //   })

    app.patch('/users/admin/:email',    async(req, res) => {
        const email = req.params.email;
        const filter = {email: email };
        const updatedDoc = {
          $set: {
            role: 'admin'
          }
        }
        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
      })

    app.patch('/users/deliveryMan/:email',    async(req, res) => {
        const email = req.params.email;
        const filter = {email: email };
        const updatedDoc = {
          $set: {
            role: 'deliveryMan'
          }
        }
        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
      })
  
  
      app.delete('/users/admin/:id',   async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await usersCollection.deleteOne(query);
        res.send(result);
      })
  



    app.post('/order',  async (req, res) => {
        const item = req.body;
        const result = await orderCollection.insertOne(item);
        res.send(result);
      })

      app.get('/order', async(req, res) => {
        const email = req.query.email;
        const query = {email: email};
        const result = await orderCollection.find(query).toArray();
        res.send(result);
      })

      app.get('/order/admin', async(req, res) => {
        const result = await orderCollection.find().toArray();
        res.send(result);
      })

     

    app.post('/users', async(req, res) => {
        const user = req.body;
  
        const query = {email:  user.email};
        const existingUser = await usersCollection.findOne(query);
        if(existingUser){
          return res.send({ message: 'user already exist' , insertedId: null })
        }
        const result = await usersCollection.insertOne(user);
        res.send(result);
      })

      app.get('/users',  async(req, res) => {
        const result = await usersCollection.find().toArray();
        res.send(result);
      })

    //   app.get('/users-stats', async(req, res) => {
    //     const result = await usersCollection.aggregate([
           
    //         {
    //             $lookup: {
    //               from: 'order',
    //               localField: 'email',
    //               foreignField: 'email',
    //               as: 'userOrders',
    //             },
                
    //           },
    //           {
    //             $unwind: '$userOrders',
    //           },
    //           {
    //             $group: {
    //               _id: '$userOrders.email',
                  

    //               phoneNumber: { $first: '$userOrders.number' },
    //               userName: { $first: '$userOrders.name' },

    //               totalQuantity: { $sum: 1 },
    //               totalRevenue: { $sum: '$userOrders.price' },
    //             },
    //           },
    //           {
    //             $project: {
    //                 _id: 0,
    //                 userName: '$userName',
    //                 email: '$_id',
    //                 phoneNumber: '$phoneNumber',
    //                 quantity: '$totalQuantity',
    //                 revenue: '$totalRevenue',
                    
    //             }
    //           }
    //     ]).toArray();
    //     res.send(result);
    //   })

    app.get('/users-stats', async (req, res) => {
        const result = await usersCollection.aggregate([
          {
            $lookup: {
              from: 'order',
              localField: 'email',
              foreignField: 'email',
              as: 'userOrders',
            },
          },
          {
            $unwind: '$userOrders',
          },
          {
            $lookup: {
              from: 'users',
              localField: 'userOrders.email',
              foreignField: 'email',
              as: 'userData',
            },
          },
          {
            $unwind: '$userData',
          },
          {
            $group: {
              _id: '$userOrders.email',
              phoneNumber: { $first: '$userOrders.number' },
              userName: { $first: '$userOrders.name' },
              role: { $first: '$userData.role' },
              totalQuantity: { $sum: 1 },
              totalRevenue: { $sum: '$userOrders.price' },
            },
          },
          {
            $project: {
              _id: 0,
              userName: '$userName',
              email: '$_id',
              phoneNumber: '$phoneNumber',
              role: '$role',
              quantity: '$totalQuantity',
              revenue: '$totalRevenue',
            },
          },
        ]).toArray();
      
        res.send(result);
      });
      

      app.delete('/order/:id',   async (req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await orderCollection.deleteOne(query);
        res.send(result);
      } )


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('bistro is sitting')
} )

app.listen(port, () => {
    console.log(`bistro is setting on port ${port}`)
})