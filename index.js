



const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const multer  = require('multer')
const port = process.env.PORT || 3007
;
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/')
    },
    filename: function (req, file, cb) {
     let data = new Date()
     let images = "images/" +file.originalname
     req.body.images=images
      cb(null, images)
    }
  })
  const bodyParser = multer({ storage: storage }).any()
  server.use(bodyParser)
server.post("/products",(req, res, next) => {
  let data=new Date()
  // req.body.createdAt=data.toIsostring()


  // Continue to JSON Server router
  next()
})
server.listen(port, () => {
  console.log(`JSON Server is running on port ${port}`);
});
server.use(middlewares);
server.use(router);
server.listen(port)
