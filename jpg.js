var path = require('path')
var fs = require('fs')
var crypto = require('crypto');
var moment = require('moment');
var piexif = require("piexifjs");
var Jimp = require("jimp");
var ExifImage = require("exif").ExifImage
var logger = require('winston');
logger.emitErrs = true;
logger.loggers.add('JPG', { console: { level: 'info', label: "JPG", handleExceptions: true, json: false, colorize: true}});
var log = logger.loggers.get('JPG');
var File = require("ucipass-file")

class JPG extends File {
	constructor(fpath) {
		super(fpath);
		this.DateTimeOriginal	 = null
		this.ImageDescription	 = null
		this.Make	 = null
		this.Model	 = null
		this.Rating	 = null
		this.XPTitle	 = null
		this.XPSubject	 = null
		this.XPKeywords	 = null
		this.XPComment	 = null
		this.gps	 = null
		this.lat	 = null
		this.lon	 = null
		this.location	 = null
		this.country	 = null
		this.cc	 = null		
	}

	isValid() {
		return true;
	}

	async createImageFile(message, xsize ,ysize ){try{
		var filename = this.fpath;
		xsize = xsize ? parseInt(xsize) : 640
		ysize = ysize ? parseInt(ysize) : 480
		message = message ? message : filename
		var path = require("path");
		log.debug("Creating Image:", filename )
		
		var image = await new Jimp(xsize, ysize)
		var font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE)
		var image = await image.print(font, 10, 10, message)
		await image.write(filename)
		log.debug("Image",filename,"with message:",message,"Created !")
		return this
	}catch(err){ log.error(err); return Promise.reject(err) }}

	async createThumbFile( thumb_filename, quality ){try{

		await this.getThumb(quality ? quality : 50 );
		const temp_buffer = this.buffer
		this.buffer = Buffer.from(this.thumb,'base64')
		await this.write(thumb_filename);
		this.buffer = temp_buffer
		return this
	}catch(err){ log.error(err); return Promise.reject(err) }}

	async getThumb(quality){try{
		var jpg = this;
		var start = new Date().getTime();
		if (!jpg.buffer){ await jpg.read() }
		var buffer = this.buffer
		var image = await Jimp.read(buffer)
		log.debug("THUMB: resizing image W:",image.bitmap.width,"H:",image.bitmap.height)
		var xSize, ySize
		if (image.bitmap.width > image.bitmap.height ) { xSize = 640 ; ySize = Jimp.AUTO}
		else { xSize = Jimp.AUTO ; ySize = 480 }
		image = await image.resize( xSize, ySize).quality(quality ? quality : 100)
		log.silly("THUMB: Resize completed!")
		var data = await new Promise((resolve,reject)=>{
			image.getBase64( Jimp.MIME_JPEG, (err,data)=> {
				if(err){reject(err)}
				else{resolve(data)}
			})
		})
		data = data.replace(/^data:image\/\w+;base64,/, '')
		log.debug("THUMB: base64 buffer created. W:",image.bitmap.width,"H:",image.bitmap.height)
		this.thumb = data
		return jpg				
	}catch(err){ log.error(err); return Promise.reject(err) }}

	async getExif(){try{
		//json.file is the only parameter that is used
		var file = this
		var resolve,reject
		var final = new Promise((res,rej) => { resolve = res, reject = rej })
		if (!this.buffer){ await file.read() }
		new ExifImage( file.buffer , function (error, exifData) {
			log.silly("EXIF: Starting...",exifData)
			if(error){
				log.debug("EXIF ERR: No Data:")
				resolve(file)
			}
			else if (!exifData || !exifData.exif || !exifData.exif.DateTimeOriginal) {
				log.debug("EXIF: No Data:")
				resolve(file)
			}
			else{
				log.silly("EXIF: OK...",file)
				file.exif = exifData
				file.DateTimeOriginal = exifData.exif.DateTimeOriginal
				//exif.UserComment	= (exifData.exif && exifData.exif.UserComment) ? (new Buffer(exifData.exif.UserComment)).toString() : null
				file.ImageDescription	= (exifData.image && exifData.image.ImageDescription) ?	exifData.image.ImageDescription : null
				file.Make	= (exifData.image && exifData.image.Make) ?		exifData.image.Make : null
				file.Model	= (exifData.image && exifData.image.Model) ?	exifData.image.Model : null
				file.Rating	= (exifData.image && exifData.image.Rating >= 0 ) ?	exifData.image.Rating.toString() : null
				const StringDecoder = require('string_decoder').StringDecoder;
				const decoder = new StringDecoder('ucs2');
				file.XPTitle	= (exifData.image && exifData.image.XPTitle) ?	decoder.write( Buffer.from(exifData.image.XPTitle)) : null
				file.XPSubject	= (exifData.image && exifData.image.XPSubject) ?	decoder.write( Buffer.from(exifData.image.XPSubject)) : null
				file.XPKeywords	= (exifData.image && exifData.image.XPKeywords) ?	decoder.write( Buffer.from(exifData.image.XPKeywords)) : null
				file.XPComment	= (exifData.image && exifData.image.XPComment) ?	decoder.write( Buffer.from(exifData.image.XPComment)) : null
				log.silly("Exif GPS Data",exifData)
				if (exifData.gps && exifData.gps.GPSLongitude){
					file.gps = {}
					log.silly("Exif GPS Conversion Start...")
					file.lat = file.convertGPS(exifData.gps.GPSLatitude[0], exifData.gps.GPSLatitude[1], exifData.gps.GPSLatitude[2], exifData.gps.GPSLatitudeRef) 
					log.silly("Exif Lat:",file.lat)
					file.lon = file.convertGPS(exifData.gps.GPSLongitude[0], exifData.gps.GPSLongitude[1], exifData.gps.GPSLongitude[2], exifData.gps.GPSLongitudeRef)
					log.silly("Exif Lon:",file.lon)
				}
				log.silly( "EXIF: Complete:" , file)
				resolve(file) ;
			}
		})
		return final
	}catch(err){ log.error(err); return Promise.reject(err) }}

	async setExif(){try{
		//json.file is the only parameter that is used
		var file = this
		var exif = file
		var resolve,reject
		var final = new Promise((res,rej) => { resolve = res, reject = rej })
		if (!exif ) {
			reject("No JSON EXIF Passed to set Exif!")
		}
		if (!this.buffer){ await this.read() }
		var exifObj =  piexif.load("data:image/jpg;base64,"+file.buffer.toString("base64"))
		//exifObj["0th"][piexif.ImageIFD.ImageDescription] = "Hello World";
		//exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] = "2010:10:11 09:09:09";
		if(exif.DateTimeOriginal){
			exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] = exif.DateTimeOriginal
		}
		if(exif.ImageDescription){
			exifObj["0th"][piexif.ImageIFD.ImageDescription] = exif.ImageDescription
		}
		if(exif.Make){
			exifObj["0th"][piexif.ImageIFD.Make] = exif.Make
		}
		if(exif.Model){
			exifObj["0th"][piexif.ImageIFD.Model] = exif.Model
		}
		if(exif.Rating){
			exifObj["0th"][piexif.ImageIFD.Rating] = parseInt(exif.Rating)
		}
		if(exif.XPTitle){
			exifObj["0th"][piexif.ImageIFD.XPTitle] = this.strEncodeUTF16(exif.XPTitle)
		}
		if(exif.XPSubject){
			exifObj["0th"][piexif.ImageIFD.XPSubject] = this.strEncodeUTF16(exif.XPSubject)
		}
		if(exif.XPKeywords){
			exifObj["0th"][piexif.ImageIFD.XPKeywords] = this.strEncodeUTF16(exif.XPKeywords)
		}
		if(exif.XPComment){
			exifObj["0th"][piexif.ImageIFD.XPComment] = this.strEncodeUTF16(exif.XPComment)
		}
		if(exif.gps){
			exifObj["GPS"][piexif.GPSIFD.GPSDateStamp] = "1999:99:99 99:99:99";
			exifObj["GPS"][piexif.GPSIFD.GPSLatitudeRef] = exif.gps.GPSLatitudeRef
			exifObj["GPS"][piexif.GPSIFD.GPSLatitude] = exif.gps.GPSLatitude
			exifObj["GPS"][piexif.GPSIFD.GPSLongitude] = exif.gps.GPSLongitude
			exifObj["GPS"][piexif.GPSIFD.GPSLongitudeRef] = exif.gps.GPSLongitudeRef
		}
		exifObj["0th"][piexif.ImageIFD.Copyright] ="Copyright, Andras Arato, 2017. All rights reserved."
		var exifBytes = piexif.dump(exifObj)
		var newData = piexif.insert(exifBytes, file.buffer.toString("binary"));
		file.buffer = Buffer.from(newData, "binary");
		await file.write()
		resolve(file)
		return final
	}catch(err){ log.error(err); return Promise.reject(err) }}

	async setExifDate(fdate){try{
		var jpg = this
		if(!fdate) {throw "No date given to set EXIF"}
		jpg.DateTimeOriginal = moment(fdate).format("YYYY:MM:DD HH:mm:ss")
        return this.setExif()
	}catch(err){ log.error(err); return Promise.reject(err) }}

	async renameByExifDate(){try{
		var file = this
		// At minimum file.fpath, file.fname has to be present
		if (  file.type().toLowerCase() != ".jpg") { 
			throw("Invalid file type NOT JPG!") 
		}
		await file.getExif()
		if ( ! file.DateTimeOriginal) {
			if(!file.mtime) { await file.stat()}
			await file.setExifDate(file.mtime)
		}
		var exifDateString = file.DateTimeOriginal
		var exifDate = moment(exifDateString,"YYYY:MM:DD HH:mm:ss")
		var exifDateFilename = path.join(path.dirname(file.fpath),  exifDate.format("YYYYMMDD_HHmmss_SSS")+".jpg" )
		// If the filename is already formatted correctly, do not change anything
		if ( exifDate.format("YYYYMMDD_HHmmss") == file.name().substring(0,15) && file.name().length == 23){
			return file
		}
		// If the new filename is taken increase the milliseconds in the filename until filename is NOT taken
		if( await file.isFile(exifDateFilename) ){
			for(var i = 1; i<991; i++){
				exifDate = exifDate.add(1,"milliseconds")
				exifDateFilename = path.join(path.dirname(file.fpath),  exifDate.format("YYYYMMDD_HHmmss_SSS")+".jpg" )
				if(await file.isFile(exifDateFilename)){
					// continue
				}
				else{
					if(i == 900){
						errorStr = "TOO MANY FILE ALREADY EXISTS WITH SAME DATETIME: " + path.join(file.fpath,file.fname)
						log.error(errorStr)
						throw(err)
					}
					i = 1000;
				}
			}
		}
		await file.rename(exifDateFilename )
		file.fpath = exifDateFilename;
		return file
		
	}catch(err){ log.error(err); return Promise.reject(err) }}

	async printExif(){try{
		var file = this
		await file.getExif()

		console.log(file.fpath)
		console.log("  DateTimeOriginal: ",file.DateTimeOriginal)
		console.log("  ImageDescription: ",file.ImageDescription)
		console.log("  Make: ",file.Make)
		console.log("  Model: ",file.Model)
		console.log("  Rating: ",file.Rating)
		console.log("  XPTitle: ",file.XPTitle)
		console.log("  XPSubject: ",file.XPSubject)
		console.log("  XPKeywords: ",file.XPKeywords)
		console.log("  XPComment: ",file.XPComment)
		console.log("  GPS: ",file.gps)
		return file

		
	}catch(err){ log.error(err); return Promise.reject(err) }}

	convertGPS(days, minutes, seconds, direction) {
		try{
			direction.toUpperCase();
			var dd = days + minutes/60 + seconds/(60*60);
			if (direction == "S" || direction == "W") {	dd = dd*-1;	} // Don't do anything for N or E
			return dd.toFixed(7);
		}
		catch(err){
			log.error("ConvertGPS Error: Incorrect Format")
			throw("ConvertGPS Error: Incorrect Format")
			return 0;
		}
	}
	strEncodeUTF16(str) {
		let arr = Array.from(str);
		var bufutf16 = []
		for (let i=0; i < arr.length; i++) {
			let code = arr[i].charCodeAt(0);
			bufutf16.push(code);
			bufutf16.push(0);
		}
		return bufutf16;
	}	
}

module.exports = JPG