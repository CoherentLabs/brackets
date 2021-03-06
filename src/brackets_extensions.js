/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */ 

// This is the JavaScript code for bridging to native functionality
// See appshell_extentions_[platform] for implementation of native methods.
//
// Note: All file native file i/o functions are synchronous, but are exposed
// here as asynchronous calls. 

/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, forin: true, maxerr: 50, regexp: true */
/*global define, native */

var appshell;
if (!appshell) {
    appshell = {};
}
if (!appshell.fs) {
    appshell.fs = {};
}
if (!appshell.app) {
    appshell.app = {};
}
(function () {    
    // Error values. These MUST be in sync with the error values
    // at the top of appshell_extensions_platform.h.
    
    /**
     * @constant No error.
     */
    appshell.fs.NO_ERROR                    = 0;
    
    /**
     * @constant Unknown error occurred.
     */
    appshell.fs.ERR_UNKNOWN                 = 1;
    
    /**
     * @constant Invalid parameters passed to function.
     */
    appshell.fs.ERR_INVALID_PARAMS          = 2;
    
    /**
     * @constant File or directory was not found.
     */
    appshell.fs.ERR_NOT_FOUND               = 3;
    
    /**
     * @constant File or directory could not be read.
     */
    appshell.fs.ERR_CANT_READ               = 4;
    
    /**
     * @constant An unsupported encoding value was specified.
     */
    appshell.fs.ERR_UNSUPPORTED_ENCODING    = 5;
    
    /**
     * @constant File could not be written.
     */
    appshell.fs.ERR_CANT_WRITE              = 6;
    
    /**
     * @constant Target directory is out of space. File could not be written.
     */
    appshell.fs.ERR_OUT_OF_SPACE            = 7;
    
    /**
     * @constant Specified path does not point to a file.
     */
    appshell.fs.ERR_NOT_FILE                = 8;
    
    /**
     * @constant Specified path does not point to a directory.
     */
    appshell.fs.ERR_NOT_DIRECTORY           = 9;
 
    /**
     * @constant Specified file already exists.
     */
    appshell.fs.ERR_FILE_EXISTS             = 10;
	
    function CallbackWrapper(callback) {
		this.realCallback = callback;
		this.callback = _.bind(callback, this, appshell.fs.NO_ERROR);
		this.error = _.bind(this.handleError, this);
    }

	CallbackWrapper.prototype.translateError = function(errors) {
		var error = errors[0];
		if (error.first === 'ArgumentType') {
			return appshell.fs.ERR_INVALID_PARAMS;
		}
		return appshell.fs[error.second] || appshell.fs.ERR_UNKNOWN;
	};
	
	CallbackWrapper.prototype.handleError = function(errors) {
		return this.realCallback(this.translateError(errors));
	};
	
	function wrapCallback(callback) {
		return new CallbackWrapper(callback);
	}

 

    /**
     * Display the OS File Open dialog, allowing the user to select
     * files or directories.
     *
     * @param {boolean} allowMultipleSelection If true, multiple files/directories can be selected.
     * @param {boolean} chooseDirectory If true, only directories can be selected. If false, only 
     *        files can be selected.
     * @param {string} title Tile of the open dialog.
     * @param {string} initialPath Initial path to display in the dialog. Pass NULL or "" to 
     *        display the last path chosen.
     * @param {Array.<string>} fileTypes Array of strings specifying the selectable file extensions. 
     *        These strings should not contain '.'. This parameter is ignored when 
     *        chooseDirectory=true.
     * @param {function(err, selection)} callback Asynchronous callback function. The callback gets two arguments 
     *        (err, selection) where selection is an array of the names of the selected files.
     *        Possible error values:
     *          NO_ERROR
     *          ERR_INVALID_PARAMS
     *
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    appshell.fs.showOpenDialog = function (allowMultipleSelection, chooseDirectory, title, initialPath, fileTypes, callback) {
        setTimeout(function () {
            engine.Call("ShowOpenDialog", allowMultipleSelection, chooseDirectory,
                             title || 'Open', initialPath || '',
                             fileTypes ? fileTypes.join(' ') : '', wrapCallback(callback));
        }, 10);
    };
    
    /**
     * Reads the contents of a directory. 
     *
     * @param {string} path The path of the directory to read.
     * @param {function(err, files)} callback Asynchronous callback function. The callback gets two arguments 
     *        (err, files) where files is an array of the names of the files
     *        in the directory excluding '.' and '..'.
     *        Possible error values:
     *          NO_ERROR
     *          ERR_UNKNOWN
     *          ERR_INVALID_PARAMS
     *          ERR_NOT_FOUND
     *          ERR_CANT_READ
     *                 
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    appshell.fs.readdir = function (path, callback) {
        var resultString = engine.Call('ReadDir', path, wrapCallback(callback));
    };
     
    /**
     * Create a new directory.
     *
     * @param {string} path The path of the directory to create.
     * @param {number} mode The permissions for the directory, in numeric format (ie 0777)
     * @param {function(err)} callback Asynchronous callback function. The callback gets one argument.
     *
     * @return None. This is an asynchronous call that sends all return information to the callback.
     **/
    appshell.fs.makedir = function (path, mode, callback) {
        engine.Call('MakeDir', path, mode, wrapCallback(callback));
    };

    /**
     * Rename a file or directory.
     *
     * @param {string} oldPath The old name of the file or directory.
     * @param {string} newPath The new name of the file or directory.
     * @param {function(err)} callback Asynchronous callback function. The callback gets one argument.
     *
     * @return None. This is an asynchronous call that sends all return information to the callback.
     **/
    appshell.fs.rename = function(oldPath, newPath, callback) {
        engine.Call('Rename', oldPath, newPath, wrapCallback(callback));
    };
 
    /**
     * Get information for the selected file or directory.
     *
     * @param {string} path The path of the file or directory to read.
     * @param {function(err, stats)} callback Asynchronous callback function. The callback gets two arguments 
     *        (err, stats) where stats is an object with isFile() and isDirectory() functions.
     *        Possible error values:
     *          NO_ERROR
     *          ERR_UNKNOWN
     *          ERR_INVALID_PARAMS
     *          ERR_NOT_FOUND
     *                 
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    appshell.fs.stat = function (path, callback) {
        engine.Call('GetFileModificationTime', path, {
			callback: function (stat) {
				callback(0, {
					isFile: function () {
						return !stat.second;
					},
					isDirectory: function () {
						return stat.second;
					},
					mtime: new Date(stat.first * 1000) // modtime is seconds since 1970, convert to ms
				});
			},
			error: function (errors) {
				callback(CallbackWrapper.prototype.translateError(errors));
			}
        });
    };
 
    /**
     * Quits native shell application
     */
    appshell.app.quit = function () {
        engine.Call('QuitApplication');
    };
 
    /**
     * Abort a quit operation
     */
    appshell.app.abortQuit = function () {
        engine.Call('AbortQuit');
    };

    /**
     * Invokes developer tools application
     */
    appshell.app.showDeveloperTools = function () {
        engine.Call('ShowDeveloperTools');
    };

    /**
     * Reads the entire contents of a file. 
     *
     * @param {string} path The path of the file to read.
     * @param {string} encoding The encoding for the file. The only supported encoding is 'utf8'.
     * @param {function(err, data)} callback Asynchronous callback function. The callback gets two arguments 
     *        (err, data) where data is the contents of the file.
     *        Possible error values:
     *          NO_ERROR
     *          ERR_UNKNOWN
     *          ERR_INVALID_PARAMS
     *          ERR_NOT_FOUND
     *          ERR_CANT_READ
     *          ERR_UNSUPPORTED_ENCODING
     *                 
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    appshell.fs.readFile = function (path, encoding, callback) {
        engine.Call('ReadFile', path, encoding, wrapCallback(callback));
    };
    
    /**
     * Write data to a file, replacing the file if it already exists. 
     *
     * @param {string} path The path of the file to write.
     * @param {string} data The data to write to the file.
     * @param {string} encoding The encoding for the file. The only supported encoding is 'utf8'.
     * @param {function(err)} callback Asynchronous callback function. The callback gets one argument (err).
     *        Possible error values:
     *          NO_ERROR
     *          ERR_UNKNOWN
     *          ERR_INVALID_PARAMS
     *          ERR_UNSUPPORTED_ENCODING
     *          ERR_CANT_WRITE
     *          ERR_OUT_OF_SPACE
     *                 
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    appshell.fs.writeFile = function (path, data, encoding, callback) {
        engine.Call('WriteFile', path, data, encoding, wrapCallback(callback));
    };
    
    /**
     * Set permissions for a file or directory.
     *
     * @param {string} path The path of the file or directory
     * @param {number} mode The permissions for the file or directory, in numeric format (ie 0777)
     * @param {function(err)} callback Asynchronous callback function. The callback gets one argument (err).
     *        Possible error values:
     *          NO_ERROR
     *          ERR_UNKNOWN
     *          ERR_INVALID_PARAMS
     *          ERR_CANT_WRITE
     *
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    appshell.fs.chmod = function (path, mode, callback) {
        engine.Call('SetPosixPermissions', path, mode, wrapCallback(callback));
    };
    
    /**
     * Delete a file.
     *
     * @param {string} path The path of the file to delete
     * @param {function(err)} callback Asynchronous callback function. The callback gets one argument (err).
     *        Possible error values:
     *          NO_ERROR
     *          ERR_UNKNOWN
     *          ERR_INVALID_PARAMS
     *          ERR_NOT_FOUND
     *          ERR_NOT_FILE
     *
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    appshell.fs.unlink = function (path, callback) {
        engine.Call('DeleteFileOrDirectory', path, wrapCallback(callback));
    };

    /**
     * Return the number of milliseconds that have elapsed since the application
     * was launched. 
     */
    // native function GetElapsedMilliseconds();
    appshell.app.getElapsedMilliseconds = function () {
        return new Date() - appshell.app.startTime;
    }
    appshell.app.startTime = new Date();
    
    /**
     * Open the live browser
     *
     * @param {string} url
     * @param {boolean} enableRemoteDebugging
     * @param {function(err)} callback Asynchronous callback function with one argument (the error)
     *        Possible error values:
     *          NO_ERROR
     *          ERR_INVALID_PARAMS - invalid parameters
     *          ERR_UNKNOWN - unable to launch the browser
     *          ERR_NOT_FOUND - unable to find a browers to launch
     *
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    appshell.app.openLiveBrowser = function (url, enableRemoteDebugging, callback) {
        // enableRemoteDebugging flag is ignored on mac
        setTimeout(function() {
            engine.Call('OpenLiveBrowser', url, enableRemoteDebugging, wrapCallback(callback));
        }, 0);
    };
    
    /**
     * Attempts to close the live browser. The browser can still give the user a chance to override
     * the close attempt if there is a page with unsaved changes. This function will fire the
     * callback when the browser is closed (No_ERROR) or after a three minute timeout (ERR_UNKNOWN). 
     *
     * @param {function(err)} callback Asynchronous callback function with one argument (the error)
     *        Possible error values:
     *          NO_ERROR (all windows are closed by the time the callback is fired)
     *          ERR_UNKNOWN - windows are currently open, though the user may be getting prompted by the 
     *                      browser to close them
     *
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    appshell.app.closeLiveBrowser = function (callback) {
        engine.Call('CloseLiveBrowser', wrapCallback(callback));
    };
 
    /**
     * Open a URL in the default OS browser window. 
     *
     * @param {function(err)} callback Asynchronous callback function with one argument (the error)
     * @param {string} url URL to open in the browser.
     *
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    appshell.app.openURLInDefaultBrowser = function (callback, url) {
        engine.Call('OpenURLInDefaultBrowser', url, wrapCallback(callback));
    };
 
    /**
     * Return the user's language per operating system preferences.
     */
    //native function GetCurrentLanguage();
    Object.defineProperty(appshell.app, "language", {
        writeable: false,
        get : function() { return 'en'; },
        enumerable : true,
        configurable : false
    });
 
    /**
     * Returns the full path of the application support directory.
     * On the Mac, it's /Users/<user>/Library/Application Support[/GROUP_NAME]/APP_NAME
     * On Windows, it's C:\Users\<user>\AppData\Roaming[\GROUP_NAME]\APP_NAME
     *
     * @return {string} Full path of the application support directory
     */
    appshell.app.getApplicationSupportDirectory = function () {
        return appshell.app.applicationSupportDirectory;
    }
	
	appshell.app.applicationSupportDirectory = '.';
	
	engine.on('SetApplicationSupportDirectory', function (directory) {
		appshell.app.applicationSupportDirectory = directory;
	});
  
    /**
     * Open the specified folder in an OS file window.
     *
     * @param {string} path Path of the folder to show.
     * @param {function(err)} callback Asyncrhonous callback function with one argument (the error)
     *
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    appshell.app.showOSFolder = function (path, callback) {
        engine.Call('ShowOSFolder', path, wrapCallback(callback));
    }
 
    /**
     * Open the extensions folder in an OS file window.
     *
     * @param {string} appURL Not used
     * @param {function(err)} callback Asynchronous callback function with one argument (the error)
     *
     * @return None. This is an asynchronous call that sends all return information to the callback.
     */
    appshell.app.showExtensionsFolder = function (appURL, callback) {
        appshell.app.showOSFolder(appshell.app.getApplicationSupportDirectory() + "/extensions", callback);
    };
 
    // Alias the appshell object to brackets. This is temporary and should be removed.
    brackets = appshell;
})();

