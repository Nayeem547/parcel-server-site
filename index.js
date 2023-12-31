const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
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
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db("parcelDB").collection("users");
    const orderCollection = client.db("parcelDB").collection("order");
    const reviesCollection = client.db("parcelDB").collection("reviews");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers );
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: "forbidden acces" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // const verifyAdmin = async (req, res, next) => {
    //   const email = req.decoded.email;
    //   const query = { email: email };
    //   const user = await usersCollection.findOne(query);
    //   const isAdmin = user?.role === "admin";
    //   if (!isAdmin) {
    //     return res.status(403).send({ message: "forbidden-access" });
    //   }
    //   next();
    // };

    // const verifyDelivery = async (req, res, next) => {
    //   const email = req.decoded.email;
    //   const query = { email: email };
    //   const user = await usersCollection.findOne(query);
    //   const isDeliveryMan = user?.role === "deliveryMan";
    //   if (!isDeliveryMan) {
    //     return res.status(403).send({ message: "forbidden-access" });
    //   }
    //   next();
    // };

    app.get("/users/checkRole/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "uinauthorized access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      let deliveryMan = false;
      if (user && user.role == "admin") {
        admin = user?.role === "admin";
      } else if (user && user.role == "deliveryMan") {
        deliveryMan = user.role == "deliveryMan";
      }
      console.log({deliveryMan, admin});
      res.send({ admin, deliveryMan });
    });

    /* app.get('/users/deliveryMan/:email', verifyToken, verifyDelivery,    async(req, res) => {
        const email = req.params.email;
        if(email !== req.decoded.email ) {
          return res.status(403).send({message: "uinauthorized access"})
        }
        const query = {email : email};
        const user = await usersCollection.findOne(query);
        let deliveryMan = false;
        if(user){
          deliveryMan = user?.role === 'deliveryMan';
        } 
        res.send({deliveryMan});
      }) */

    app.post("/users", async (req, res) => {
      const user = req.body;

      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exist", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });


    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = {email: email};
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    

    app.get("/delivery-men", async (req, res) => {
      const result = await usersCollection
        .find({ role: "deliveryMan" })
        .toArray();
      res.send(result);
    });

    // Add a new route to handle the assignment
    // app.patch('/order/:id', async (req, res) => {
    //     try {
    //         const id = req.params.id;
    //         const filter = {_id: new ObjectId(id)};
    //       const { deliveryManEmail } = req.body;

    //       // Check if the order exists
    //       const order = await orderCollection.findOne({ _id: id });
    //       if (!order) {
    //         return res.status(404).json({ error: 'Order not found' });
    //       }

    //       // Update the order with the assigned delivery man and set status to 'On The Way'
    //       const updatedOrder = await orderCollection.findOneAndUpdate(
    //         { _id: id },
    //         {
    //           $set: {
    //             deliveryManEmail,
    //             status: 'On The Way',
    //           },
    //         },
    //         { returnDocument: 'after' } // Return the updated document
    //       );

    //       res.json(updatedOrder.value);
    //     } catch (error) {
    //       console.error('Error assigning delivery man:', error);
    //       res.status(500).json({ error: 'Internal Server Error' });
    //     }
    //   });

    app.patch("/order/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const { deliveryMan } = req.body;

      const updatedDoc = {
        $set: {
          deliveryMan,
          status: "On-The-Way",
        },
      };

      const result = await orderCollection.findOneAndUpdate(filter, updatedDoc);

      res.send(result);
    });

    // app.patch('/order/deliveryMan/:id', async (req, res) => {
    //     const id = req.params.id;
    //     const filter = { _id: new ObjectId(id) };
    //     const result = await orderCollection.updateOne(
    //         { filter , deliveryMan: { $exists: true } },
    //     {
    //       $unset: { deliveryMan: '' },
    //       $set: { status: 'Cancelled' }
    //     });

    //     res.send(result);
    //   });

    app.patch("/order/deliveryMan/:orderId", async (req, res) => {
      const orderId = req.params.orderId;
      const filter = { _id: new ObjectId(orderId) };
      const updatedDoc = {
        $set: {
          deliveryMan: "",
          status: "Cancelled",
        },
      };
      const result = await orderCollection.findOneAndUpdate(filter, updatedDoc);
      res.send(result);
    });
    app.patch("/order/delivered/:orderId", async (req, res) => {
      const orderId = req.params.orderId;
      const filter = { _id: new ObjectId(orderId) };
      const updatedDoc = {
        $set: {
          status: "Delivered",
        },
      };
      const result = await orderCollection.findOneAndUpdate(filter, updatedDoc);
      res.send(result);
    });

    // Add a new route to handle the assignment

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

    app.patch("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/users/deliveryMan/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updatedDoc = {
        $set: {
          role: "deliveryMan",
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.delete("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/order", async (req, res) => {
      const item = req.body;
      const result = await orderCollection.insertOne(item);
      res.send(result);
    });

    //new update code here
    app.post("/reviews", async (req, res) => {
      const item = req.body;
      const result = await reviesCollection.insertOne(item);
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await reviesCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const { userInfo } = req.body;
      // Assuming imagefile is coming in req.body
      const updatedDoc = {
        $set: {
          name: userInfo.name,
          image: userInfo.image,
        },
      };
      const result = await usersCollection.findOneAndUpdate(query, updatedDoc, {
        upsert: true,
      });
      res.send(result);
    });

    //new update code end

    app.get("/order", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/order/admin", async (req, res) => {
      const result = await orderCollection.find().toArray();
      res.send(result);
    });

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

    app.get("/order/total", async (req, res) => {
      const result = await orderCollection
        .aggregate([
          {
            $group: {
              _id: null,
              totalQuantity: { $sum: 1 }, // Assuming your order documents have a field named 'quantity'
            },
          },
        ])
        .toArray();

      res.send(result);
    });

    app.get("/users/total-users", async (req, res) => {
      const result = await usersCollection
        .aggregate([
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 }, // Assuming your order documents have a field named 'quantity'
            },
          },
        ])
        .toArray();

      res.send(result);
    });

    app.get("/order/delivered-total", async (req, res) => {
      const result = await orderCollection
        .aggregate([
          {
            $match: {
              status: "Delivered",
            },
          },
          {
            $group: {
              _id: null,
              totalDelivered: { $sum: 1 },
            },
          },
        ])
        .toArray();
      res.send(result);
    });

    //NEW CODE
    app.get("/all-delivery-man", async (req, res) => {
      const result = await usersCollection
        .aggregate([
          // {
          //   $match: {
          //     role: "deliveryMan",
          //   },
          // },
          {
            $lookup: {
              from: "order",
              localField: "email",
              foreignField: "deliveryMan",
              as: "deliveryManOrders",
            },
          },
          {
            $unwind: "$deliveryManOrders",
          },

          {
            $lookup: {
              from: "reviews",
              localField: "email",
              foreignField: "deliveryMan",
              as: "review",
            },
          },
          // {
          //   $unwind: '$usersData',
          // },
          {
            $group: {
              _id: "$deliveryManOrders.deliveryMan",
              // phoneNumber: { $first: '$deliveryManOrders.number' },
              userName: { $first: "$name" },
              DeliveryNumber: { $first: "$review.DeliveryNumber" },
              totalQuantity: { $sum: 1 },
              avgRating: { $avg: "$review.ratings" },
            },
          },
          {
            $project: {
              _id: 0,
              userName: "$userName",
              email: "$_id",
              // phoneNumber: '$phoneNumber',

              quantity: "$totalQuantity",
              avgRatings: "$avgRating",
              DeliveryNumber: "$DeliveryNumber",
            },
          },
        ])
        .toArray();
      res.send(result);
    });
    // new code end

    app.get("/users-stats", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      console.log(page, size);
      const result = await usersCollection
        .aggregate([
          {
            $lookup: {
              from: "order",
              localField: "email",
              foreignField: "email",
              as: "userOrders",
            },
          },
          {
            $unwind: "$userOrders",
          },
          {
            $lookup: {
              from: "users",
              localField: "email",
              foreignField: "email",
              as: "userData",
            },
          },
          {
            $unwind: "$userData",
          },
          {
            $group: {
              _id: "$userData.email",
              phoneNumber: { $first: "$userOrders.number" },
              userName: { $first: "$userData.name" },
              role: { $first: "$userData.role" },
              totalQuantity: { $sum: 1 },
              totalRevenue: { $sum: "$userOrders.price" },
            },
          },
          {
            $project: {
              _id: 0,
              userName: "$userName",
              email: "$_id",
              phoneNumber: "$phoneNumber",
              role: "$role",
              quantity: "$totalQuantity",
              revenue: "$totalRevenue",
            },
          },
        ])
        .skip(page * size)
        .limit(size)
        .toArray();

      res.send(result);
    });

    //paginition
    /* app.get("/users-stats-pagination", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      
      const result = await usersCollection.find()
      .skip(page * size)
      .limit(size)
      .toArray();
      console.log(page, size, result);
      res.send(result);
    }); */

    app.get("/productsCount", async (req, res) => {
      const count = await usersCollection.estimatedDocumentCount();
      res.send({ count });
    });

    //paginition end

    //   {
    //     $match: { email: userEmail } // Match the user based on the provided email
    //   },const userEmail = req.params.email;

    app.get("/delivery-stats/:email", async (req, res) => {
      const userEmail = req.params.email;
      // Perform an aggregation to match orders based on the deliveryMan field
      const result = await usersCollection
        .aggregate([
          {
            $match: { email: userEmail },
          },
          {
            $lookup: {
              from: "order",
              localField: "email",
              foreignField: "deliveryMan", // Match orders where deliveryMan field equals user's email
              as: "userOrders",
            },
          },
          {
            $unwind: "$userOrders", // Unwind the array created by $lookup
          },
          //   {
          //     $group: {
          //       _id: '$userOrders.deliveryMan',
          //       receiversNumber:  '$userOrders.receiversNumber' ,
          //       receiverName:  '$userOrders.receiverName' ,

          //     },
          //   },
          {
            $project: {
              _id: 0,
              orderIds: "$userOrders._id",
              email: "$userOrders.deliveryMan",
              bookUsername: "$userOrders.name",
              receiverName: "$userOrders.receiverName",
              bookPhoneNumber: "$userOrders.number",
              requestedDeliveryDate: "$userOrders.date",
              Aproxidate: "$userOrders.Aproxidate",
              receiversNumber: "$userOrders.receiversNumber",
              reciverAddress: "$userOrders.parcelAdress",
              status: "$userOrders.status",
            },
          },
        ])
        .toArray();

      res.json(result);
    });

    // app.get('/users-stats', async (req, res) => {
    //     const result = await usersCollection.aggregate([
    //         {
    //             $lookup: {
    //               from: 'order',
    //               localField: 'usersName',
    //               foreignField: 'usersName',
    //               as: 'orderData',
    //             },
    //           },
    //           {
    //             $unwind: { path: '$orderData', preserveNullAndEmptyArrays: true },
    //           },
    //           {
    //             $group: {
    //               _id: '$usersName',
    //               totalQuantity: { $sum: { $ifNull: ['$orderData.quantity', 0] } },
    //               totalRevenue: { $sum: { $ifNull: ['$orderData.price', 0] } },
    //               uniqueRecipes: { $addToSet: '$orderData.recipe' },
    //               userEmail: { $first: '$email' }, // To include the email field
    //             },
    //           },
    //           {
    //             $project: {
    //               _id: 0,
    //               usersName: '$_id',
    //               userEmail: 1,
    //               totalQuantity: 1,
    //               totalRevenue: 1,
    //               uniqueRecipes: 1,
    //             },
    //           },
    //     ]).toArray();

    //     res.send(result);
    //   });

    // app.get('/users-stats', async (req, res) => {
    //     const result = await usersCollection.aggregate([
    //       {
    //         $lookup: {
    //           from: 'order',
    //           localField: 'email',
    //           foreignField: 'email',
    //           as: 'userOrders',
    //         },
    //       },

    //       {
    //         $project: {
    //           _id: 0,
    //           userName: 1,
    //           email: 1,
    //           phoneNumber: { $ifnull: [{$arrayElemAt: ["$userOrders.number", 0]}, "no data"]},
    //           role: { $ifnull: [{$arrayElemAt: ["$userOrders.role", 0]}, "no data"]},
    //           quantity: { $ifnull: [{$arrayElemAt: ["$userOrders.number", 0]}, "no data"]},
    //           revenue: { $ifnull: [{$arrayElemAt: ["$userOrders.price", 0]}, "no data"]},
    //         },
    //       },
    //     ]).toArray();

    //     res.send(result);
    //   });

    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("parcel is booking");
});

app.listen(port, () => {
  console.log(`parcel is setting on port ${port}`);
});
