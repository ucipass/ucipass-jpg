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
        return assert.equal( await jpg.isFile() , true )
    });

    it('Hash Creation', async function(){
        var jpg = new JPG(testfile1)
        await jpg.createImageFile("testfile1",1024,768)
        await jpg.hashfn(true)
        jpg.hash.should.equal("2e612028e6b80f01ec0bc2781e829a78")
        return Promise.resolve(true)
    });

    it('Thumb Creation', async function(){
        var jpg = new JPG(testfile1)
        if(! await jpg.isFile(testfile1)) { await jpg.createImageFile("testfile1",1024,768) }
        await jpg.getThumb()
        jpg.buffer = Buffer.from(jpg.thumb, 'base64')
        return true
    });

    it('Add Exif to Image, Get Exif from Image', async function(){
       var jpg = new JPG(testfile1)
        if(! await jpg.isFile(testfile1)) { await jpg.createImageFile("testfile1",1024,768) }
        jpg.exif = {
            "DateTimeOriginal" : "2011:11:11 11:11:11",
            "ImageDescription" : "Test Description, Hello, Andras, Alexandra, Eva, Adam ,Gabor",
            "Rating"    : "0",
            "Make" : "NodeJS",
            "Model" : "JIMP",
            "gps" : {
                GPSLatitudeRef: 'N',
                GPSLatitude: [[44,1],[51,1],[31,1]],
                GPSLongitudeRef: 'W',
                GPSLongitude: [[86,1],[4,1],[0,1]],
                lat: '34.1', 
                lon: '86.1'
            }
        }
        await jpg.setExif()
        await jpg.getExif()
        jpg.exif.Make.should.equal("NodeJS")
        jpg.exif.Model.should.equal("JIMP")
        jpg.exif.Rating.should.equal(0)
        jpg.exif.ImageDescription.should.equal("Test Description, Hello, Andras, Alexandra, Eva, Adam ,Gabor")
        jpg.exif.DateTimeOriginal.should.equal("2011:11:11 11:11:11")
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
        return jpg.exif.DateTimeOriginal.should.equal(dateString)
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


})
