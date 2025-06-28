const FILEINPUT = document.getElementById("fontdata");
const FINEINPUTLABEL = document.getElementById("fontdatalabel");
const FILESLIST = document.getElementById("fileslist");
const UPLOADFILES = document.getElementById("uploadfiles");

let fontData;
let fontFiles = [];

class Font {
    constructor(text, images) {
        this.text = text;
        this.images = images;
        this.createImageWindow();
    }

    getFilesEvent(event) {
        let fontImages = [];
        let fontText;
        let fontName;
        fontFiles = event.target.files;
        for (let file of fontFiles) {
            console.log(file.type);
            if (file.type === "text/plain") {
                fontName = file.name.replace(".txt", "");
                fontText = file;
            }
            if (file.type === "image/png") {
                fontImages.push(file);
            }
        }
        if (fontImages.length > 0 && fontText) {
            for (let image of fontImages) {
                if (!image.name.includes(fontName)) {
                    FINEINPUTLABEL.innerHTML = "One or all of the image file names do not match the .txt file name <br>";
                    FILEINPUT.value = null;
                    return;
                }
            }
            let txtName = document.createElement("li");
            txtName.textContent = fontText.name;
            FILESLIST.appendChild(txtName);
            for (let image of fontImages) {
                let imgName = document.createElement("li");
                imgName.textContent = image.name;
                FILESLIST.appendChild(imgName);
            }
            FINEINPUTLABEL.innerHTML = "Files Selected <br>";
            fontData = new Font(fontText, fontImages);
        } else {
            FINEINPUTLABEL.innerHTML = "Please select a .txt file and png image files <br>";
            FILEINPUT.value = null;
        }
    }

    createImageWindow() {
        const scrollDiv = document.createElement('div');
        scrollDiv.id = "imageWindow";
        scrollDiv.style.cssText = `
        width: 700px;
        height: 200px;
        overflow-x: scroll;
        overflow-y: hidden;
        white-space: nowrap;
        background-color: lightgrey;
        border: 1px solid black;
        padding: 10px;
    `;

    // Create a container for overlayed images
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
        position: relative;
        height: 100%;
        display: inline-block;
    `;

    // Add each image as an overlayed layer
    this.images.forEach(image => {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(image);
        img.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: auto;
        `;
        
        imageContainer.appendChild(img);
    });

    scrollDiv.appendChild(imageContainer);

    // Set container width based on the natural aspect ratio of images
    const firstImg = imageContainer.querySelector('img');
    firstImg.onload = () => {
        const aspectRatio = firstImg.naturalWidth / firstImg.naturalHeight;
        const containerHeight = scrollDiv.clientHeight - 20; // subtract padding
        imageContainer.style.width = `${containerHeight * aspectRatio}px`;
    };

    const parent = UPLOADFILES.parentElement;
    parent.style.display = 'flex';
    parent.style.gap = '10px';    // Adds space between elements
    parent.style.alignItems = 'start'; // Aligns items at the top

    UPLOADFILES.after(scrollDiv);
    UPLOADFILES.style.height = scrollDiv.style.height;

    // Cleanup object URLs on unload
    window.addEventListener('unload', () => {
        const images = imageContainer.getElementsByTagName('img');
        Array.from(images).forEach(img => {
            URL.revokeObjectURL(img.src);
        });
    });
}
}

FILEINPUT.onchange = Font.prototype.getFilesEvent;