const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const multer = require('multer');
const Grid = require('gridfs-stream');
const GridFsStorage = require('multer-gridfs-storage');
const methodOverride = require('method-override');


const app = express();

// Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

// Mongo URI
const mongoURI = 'mongodb://localhost:27017/uploads';

// create mongo connection
const conn = mongoose.createConnection(mongoURI);
// init gfs
let gfs;

conn.once('open', () => {
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
})

// Storage engine for multer
let storage = new GridFsStorage({
    url: mongoURI,
    file: (req,file) => {
        return new Promise((resolve,reject) => {
            crypto.randomBytes(16, (err,buf) => {
                if(err) {
                    return reject(err);
                }
                console.log();
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});
const upload = multer({storage});

// @route GET / loads doc from mongodb
app.get('/', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // check if files
        if(!files || files.length === 0) {
            res.render('index', {files: false});
        } else {
            files.map(file => {
                if(file.contentType === 'image/jpeg' || file.contentType === 'image/png'){
                    file.isImage = true;
                } else {
                    file.isImage = false;
                }
            })
        }
        res.render('index', {files: files});
    })
});

// @route POST /upload
app.post('/upload', upload.single('File'), (req,res) => {
    // res.json({file: req.file});
    res.redirect('/');
});
// @route GET /image/:filename
app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({filename: req.params.filename}, (err, file) => {
        if(!file || file.length === 0) {
            return res.status(404).json({err: 'No file exists'});
        }
        // check type
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/png'){
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        } else {
            return res.status(404).json({
                err: 'Not an image'
            });
        }
    });
});

// @route DELETE /files/:id for delete
app.delete('/files/:id', (req, res) => {
    gfs.remove({_id: req.params.id, root: 'uploads'}, (err, gridStore)=> {
        if(err){
            return res.status(404).json({err});
        }
        res.redirect('/');
    });
});


const port = 5000;
app.listen(port, () => console.log(`server started on ${port}`));

