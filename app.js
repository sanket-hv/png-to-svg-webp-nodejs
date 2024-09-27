const express = require('express');
const sharp = require('sharp');
const potrace = require('potrace');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001;

// Directory to save converted SVG files
const outputDirectory = path.join(__dirname, 'output');

// Ensure the output directory exists
if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
}

// Configure multer for file uploads (storing uploaded PNGs in 'uploads' directory)
const upload = multer({ dest: 'uploads/' });

// Endpoint to convert multiple PNG files to SVG and save locally
app.post('/convert-png-to-svg', upload.array('images', 30), (req, res) => {
    const files = req.files;

    if (!files || files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    const svgPromises = files.map((file) => {
        const inputPngPath = file.path;
        const outputSvgPath = path.join(outputDirectory, file.originalname.replace('.png', '.svg'));

        return new Promise((resolve, reject) => {
            // Convert PNG to SVG using sharp and potrace
            sharp(inputPngPath)
                .png()
                .toBuffer((err, buffer) => {
                    if (err) {
                        return reject(`Error processing image: ${file.originalname}`);
                    }

                    potrace.trace(buffer, (err, svg) => {
                        if (err) {
                            return reject(`Error tracing image: ${file.originalname}`);
                        }

                        // Write the SVG content to a file in the output directory
                        fs.writeFile(outputSvgPath, svg, (err) => {
                            if (err) {
                                return reject(`Error saving SVG: ${file.originalname}`);
                            }

                            resolve({
                                filename: file.originalname.replace('.png', '.svg'),
                                outputPath: outputSvgPath
                            });
                        });
                    });
                });
        });
    });

    // Process all files and return a response when done
    Promise.all(svgPromises)
        .then((results) => {
            res.json({
                message: 'Files converted and saved successfully.',
                files: results
            });
        })
        .catch((error) => {
            res.status(500).send(`Error converting images: ${error}`);
        });
});

app.post('/convert-png-to-webp', upload.array('images', 30), (req, res) => {
    const files = req.files;

    if (!files || files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    const webpPromises = files.map((file) => {
        const inputPngPath = file.path;
        const outputWebpPath = path.join(outputDirectory, file.originalname.replace('.png', '.webp'));

        return sharp(inputPngPath)
            .toFormat('webp')  // Convert image to WebP format
            .toFile(outputWebpPath)  // Save the WebP file
            .then(() => ({
                filename: file.originalname.replace('.png', '.webp'),
                outputPath: outputWebpPath
            }))
            .catch((err) => {
                throw new Error(`Error converting image: ${file.originalname}`);
            });
    });

    // Process all files and return a response when done
    Promise.all(webpPromises)
        .then((results) => {
            res.json({
                message: 'Files converted and saved successfully.',
                files: results
            });
        })
        .catch((error) => {
            res.status(500).send(`Error converting images: ${error.message}`);
        });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
