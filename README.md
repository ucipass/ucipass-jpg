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