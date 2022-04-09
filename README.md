# ucipass-jpg
JPG and EXIF manipulation class

# Examples

## Thumb Creation
````
const JPG = require('@ucipass/jpg')

const jpg = new JPG("test.jpg")
jpg.createThumbFile("thumb_test.jpg")
.then(()=>{ console.log(`Success!`)})
.catch(()={ console.log(`Failure!`)})
````

## Create thumb files with directory structure based on source directory

````
const JPG = require('@ucipass/jpg')

const jpg = new JPG()
const jpg_dir   = "./public/pics"
const thumb_dir = "./public/thumbs"
const quality   = 50

jpg.createThumbDir( jpg_dir, thumb_dir, quality )  // returns promise
````
