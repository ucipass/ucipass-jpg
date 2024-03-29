var path = require('path')
var assert = require('assert')
var fs = require('fs')
var moment = require('moment')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var should = require('chai').should();
var File = require("ucipass-file")
var JPG = require('../jpg.js')

describe('JPG Unit Tests', function(){

    var galleryDir = path.join(__dirname,"../test/files")

    var testfile1 = path.join(galleryDir,"dir1/1.jpg")
    var testfile2 = path.join(galleryDir,"dir2/2.jpg")
    var testfile3 = path.join(galleryDir,"dir3/3.jpg")
    var testfile4 = path.join(galleryDir,"dir4/4.jpg")
    var testfile5 = path.join(galleryDir,"dir5/5.jpg")
    
    before("Deleting and Setting Directories Only", async function(){

        var file = new File("testfile1")
        if( await file.isFile(testfile1)) await file.unlink(testfile1)
        if( await file.isFile(testfile2)) await file.unlink(testfile2)
        if( await file.isFile(testfile3)) await file.unlink(testfile3)
        if( await file.isFile(testfile4)) await file.unlink(testfile4)
        if( await file.isFile(testfile5)) await file.unlink(testfile5)

        mkdirp.sync(path.dirname(testfile1))   
        mkdirp.sync(path.dirname(testfile2))   
        mkdirp.sync(path.dirname(testfile3)) 
        mkdirp.sync(path.dirname(testfile4)) 
        mkdirp.sync(path.dirname(testfile5))
        
    })

    after("Deleting and Setting Directories Only", function(done){
        rimraf(galleryDir,(err)=>{ if(err){ done(err)} else{ done()} })
    })

    it('Create File', async function(){
        var jpg = new JPG(testfile1)
        await jpg.createImageFile("testfile1",1024,768)
        result = await jpg.isFile() 
        return assert.equal( true, true )
    });

    it('Hash Creation', async function(){
        var jpg = new JPG(testfile1)
        if(! await jpg.isFile(testfile1)) { await jpg.createImageFile("testfile1",1024,768) }
        await jpg.hashfn(true)
        jpg.hash.should.equal("555cf275880860d105b92a39d06b40e7")
        return Promise.resolve(true)
    });

    it('Thumb Creation Base64', async function(){
        var jpg = new JPG(testfile1)
        if(! await jpg.isFile(testfile1)) { await jpg.createImageFile("testfile1",1024,768) }
        var start = new Date().getTime()
        await jpg.getThumb()
        //console.log("2:",new Date().getTime() - start, "ms","size",jpg.thumb.length)
        var thumb2 = new JPG(testfile2)
        thumb2.buffer = Buffer.from(jpg.thumb,'base64')
        await thumb2.write()
        
        start = new Date().getTime()
        await jpg.getThumb(50) //set quality lower to save space
        //console.log("3:",new Date().getTime() - start, "ms","size",jpg.thumb.length)
        thumb3 = new JPG(testfile3)
        thumb3.buffer = Buffer.from(jpg.thumb,'base64')
        await thumb3.write()

        assert(thumb3.buffer.length < thumb2.buffer.length, true)
    });

    it('Thumb Creation File', async function(){
        const jpg = new JPG(testfile1)
        if(! await jpg.isFile(testfile1)) { await jpg.createImageFile("testfile1",1024,768) }
        await jpg.createThumbFile("thumb_testfile1")

        //Testing
        const thumb = new JPG("thumb_testfile1")
        await thumb.getThumb()
        buffer_length_original = jpg.buffer.length
        buffer_length_thumb    = thumb.buffer.length
        await thumb.unlink()
        assert( buffer_length_thumb < buffer_length_original , true)
    });

    it('Thumb Creation Bulk', async function(){

        const jpg = new JPG()
        const jpg_dir   = "./test/files"
        const thumb_dir = "./test/files_thumbs"
        const quality   = 50

        await jpg.createThumbDir( jpg_dir, thumb_dir, quality )

		const readDirRecursive = async (filePath) => {
			const dir = await fs.promises.readdir(filePath);
			const files = await Promise.all(dir.map(async relativePath => {
				const absolutePath = path.join(filePath, relativePath);
				const stat = await fs.promises.lstat(absolutePath);
		
				return stat.isDirectory() ? readDirRecursive(absolutePath) : absolutePath;
			}));
		
			return files.flat();
		}

		let files = await readDirRecursive (jpg_dir)
        files = files.filter((file)=>{ return file.slice(-3) == "JPG" || file.slice(-3) == "jpg" })

        let thumb_files = await readDirRecursive (thumb_dir)
        thumb_files = thumb_files.filter((file)=>{ return file.slice(-3) == "JPG" || file.slice(-3) == "jpg" })

        // Clean-up 
        await fs.promises.rm( thumb_dir ,{ recursive: true, force: true })
        assert( files.length ==  thumb_files.length, true)
    });

    it('Add Exif to Image, Get Exif from Image', async function(){
        var jpg = new JPG(testfile1)
        if(! await jpg.isFile(testfile1)) { await jpg.createImageFile("testfile1",1024,768) }
        jpg.DateTimeOriginal = "2011:11:11 11:11:11"
        jpg.ImageDescription = "Test Description"
        jpg.Rating = "0"
        jpg.Make = "NodeJS"
        jpg.Model = "JIMP"
        jpg.XPTitle = "Test XPTitle"
        jpg.XPSubject = "Test XPSubject"
        jpg.XPKeywords = "Andras;Eva;Adam;Alexandra"
        jpg.XPComment = "Test XPComment"
        jpg.gps = {
            GPSLatitudeRef: 'N',
            GPSLatitude: [[44,1],[51,1],[31,1]],
            GPSLongitudeRef: 'W',
            GPSLongitude: [[86,1],[4,1],[0,1]],
        }
        await jpg.setExif()

        var jpg2 = new JPG(testfile1)
        await jpg2.getExif()
        jpg2.DateTimeOriginal.should.equal("2011:11:11 11:11:11")
        jpg2.ImageDescription.should.equal("Test Description")
        jpg2.Rating.should.equal("0")
        jpg2.Make.should.equal("NodeJS")
        jpg2.Model.should.equal("JIMP")
        jpg2.XPTitle.should.equal("Test XPTitle")
        jpg2.XPSubject.should.equal("Test XPSubject")
        jpg2.XPKeywords.should.equal("Andras;Eva;Adam;Alexandra")
        jpg2.XPComment.should.equal("Test XPComment")
        return true
    });

    it('Change/Add Date to Image Exif', async function(){
        var jpg = new JPG(testfile1)
        if(! await jpg.isFile(testfile1)) { await jpg.createImageFile("testfile1",1024,768) }
        await jpg.stat()
        var fdate = moment(jpg.mtime).subtract(1,"year").toDate()
        var dateString = moment(fdate).format("YYYY:MM:DD HH:mm:ss")
        await jpg.setExifDate(fdate)
        await jpg.getExif()
        return jpg.DateTimeOriginal.should.equal(dateString)
    });

    it('Change filename based on Image Exif Date', async function(){
        var jpg = new JPG(testfile1)
        if(! await jpg.isFile(testfile1)) { await jpg.createImageFile("testfile1",1024,768) }
        await jpg.stat()
        //Set Exif for test file based on mtime
        await jpg.setExifDate(jpg.mtime)
        //Create conflicting images to affect renaiming
        var basedir = path.dirname(jpg.fpath)
        var newtestfile1 = path.join ( basedir,   moment(jpg.mtime).format("YYYYMMDD_HHmmss")+".jpg" )
        await jpg.rename(jpg.fpath,newtestfile1 )
        var exifFilename0 = path.join(basedir,  moment(jpg.mtime).format("YYYYMMDD_HHmmss")+"_000.jpg"   )    
        var exifFilename1 = path.join(basedir,  moment(jpg.mtime).format("YYYYMMDD_HHmmss")+"_001.jpg"   )
        var correctFilename = path.join(basedir,  moment(jpg.mtime).format("YYYYMMDD_HHmmss")+"_002.jpg"   )
        var jpg0 =new JPG(exifFilename0)  
        await jpg0.createImageFile()
        var jpg1 =new JPG(exifFilename1)  
        await jpg1.createImageFile()
        //The actual rename
        await jpg.renameByExifDate()
        //Test
        var isFile = await jpg.isFile( correctFilename)
        await jpg0.unlink();
        await jpg1.unlink();
        await jpg.rename(testfile1);
        return isFile.should.equal(true)
    });

    it('Get Location from Image', async function(){

        return true
    });

})
