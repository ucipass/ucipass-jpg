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
const jpg_dir   = "./test/files"
const thumb_dir = "./test/files_thumbs"
const quality   = 50

await jpg.createThumbDir( jpg_dir, thumb_dir, quality )
````