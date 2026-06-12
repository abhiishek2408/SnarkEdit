const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

app.use(cors());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

app.post('/remove-bg', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const inputPath = req.file.path;
  const outputPath = path.join(__dirname, 'uploads', `output-${Date.now()}.png`);

  console.log(`Processing image: ${inputPath}`);

  // Spawn python process
  const pythonProcess = spawn('python', ['bg_remove.py', inputPath, outputPath]);

  let pythonError = '';

  pythonProcess.stderr.on('data', (data) => {
    pythonError += data.toString();
  });

  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`Python script exited with code ${code}`);
      console.error(pythonError);
      return res.status(500).send('Error processing image');
    }

    console.log(`Background removed successfully: ${outputPath}`);
    res.sendFile(outputPath, (err) => {
      // Cleanup files after sending
      fs.unlink(inputPath, () => {});
      fs.unlink(outputPath, () => {});
    });
  });
});

app.listen(port, () => {
  console.log(`Background removal server listening at http://localhost:${port}`);
});
