var DATA_TYPES_PROP_NAME		= "dataTypes";
var XNL_ROOT_NAME				= "dt";
var DATA_TYPE_ATTRIBUTE_NAME	= ("dataType").toLowerCase();
var POST_EVENT_VALIDATION_ATTRIBUTE_NAME = ("postEventValidation").toLowerCase();
var DELETE_INVALID_CHARS_ATTRIBUTE_NAME = ("deleteInvalidChars").toLowerCase();
var ONSUBMIT_VALIDATION_ATTRIBUTE_NAME = ("pattern").toLowerCase();
var	KEYPRESS					= "keypress";
var PASTE						= "paste";
var DROP						= "drop";
var HANDLED_EVENTS_ARR			= [KEYPRESS, PASTE, DROP];

var XML_NS						= "http://www.w3.org/2000/svg";

var ERROR						= -1;
var INIT						= 0;
var PARSING						= 1;
var LOADING						= 2;
var VALIDATING					= 3;
var READY						= 4;
var DEFAULT						= 5;

var JSON_TYPE					= "JSON";
var XML_TYPE					= "XML";
var UNHANDLED_TYPE				= "OTHER";

var ERROR_CODE_PROP_NAME		= "code";
var ERROR_MESSAGE_PROP_NAME		= "message";
var ERROR_EXCEPTION_PROP_NAME	= "exception";

var dtSchema = {
    "type" : "object",
    "$schema" : "http://json-schema.org/draft-03/schema",
    "id" : "http://jsonschema.net",
    "required" : true,
	"additionalProperties": false,
	"properties":
	{
		"dataTypes":
		{
			"type" : "array",
			"minitems" : "1",
			"id" : "http://jsonschema.net/dataTypes",
			"required" : true,
			"uniqueItems" : true,
			"items" :
			{
				"type" : "object",
				"id" : "http://jsonschema.net/dataTypes/0",
				"required":true,
				"additionalProperties": false,
				"properties":
				{
					"formatDesc" :
					{
						"type" : "string",
						"id" : "http://jsonschema.net/dataTypes/0/formatDesc",
						"required" : true
					},
					"invalidChars":
					{
						"type" : "string",
						"id" : "http://jsonschema.net/dataTypes/0/invalidChars",
						"required" : true
					},
					"name" :
					{
						"type" : "string",
						"id" : "http://jsonschema.net/dataTypes/0/name",
						"required" : true
					},
					"validPattern":
					{
						"type" : "string",
						"id" : "http://jsonschema.net/dataTypes/0/validPattern",
						"required" : true
					},
					"validValuePattern":
					{
						"type" : "string",
						"id" : "http://jsonschema.net/dataTypes/0/validValuePattern",
						"required" : true
					}
				},
				"required": ["formatDesc", "invalidChars", "name", "validPattern", "validValuePattern"]
			}    
		}
    },
	"required": ["dataTypes"]
};

/**
 * The data type object 
 * @param input : A JSON data types in either Object or string. Or a URL of JSON to be retrieved
 * @param statusChange : callback function pointer
 * @returns {Object} DataTypes object
 */
function DataTypes(input, stateChange)
{
	// define functions and members first
	// ----------------------------------
	
	this.init = function()
	{
		window.dto						= this;
		this.dataTypesPropName			= DATA_TYPES_PROP_NAME;
		this.namePropName				= "name";
		this.invalidCharsPropName		= "invalidChars";
		this.validPatternPropName		= "validPattern"; // will be used for post event validation
		this.validValuePatternPropName	= "validValuePattern"; // will be used for on submit validation
		this.dataTypeFormatDescPropName	= "formatDesc";
		
		this.names 						= []; // dataType names array will be used to retrieve the dataType index (faster performance)
		this.removedName 				= []; 
		
		this.removeOneNode 				= 1;
		
		//this.status = this.init;
		this.readyState					= INIT;
		this.onReadyStateChange;
		
		this.dataTypesValidated = false;
		
		// define the default data type
		// --------------------------------------------------
		this.defualtDataType							= {};
		this.defualtDataType[this.dataTypesPropName]	= [];
		
		var defualtType									= {};
		defualtType[this.namePropName]					= "any";
		defualtType[this.invalidCharsPropName]			= "[\\u0014]";
		defualtType[this.validPatternPropName]			= "[^\\u0014]";
		defualtType[this.validValuePatternPropName]		= "^[\\s\\S]*$";
		defualtType[this.dataTypeFormatDescPropName]	= "Any and all characters";
		
		this.defualtDataType[this.dataTypesPropName].push(defualtType);
		
	}
	
	/**
	*
	*/
	this.setError = function(errCode, errMessage, errException)
	{
		this.error								= {};
		this.error[ERROR_CODE_PROP_NAME]		= errCode;
		this.error[ERROR_MESSAGE_PROP_NAME]		= errMessage;
		this.error[ERROR_EXCEPTION_PROP_NAME]	= errException;
		this.error.toString						= customDataTypeToString;
		console.log(this.error);
		this.setReadyState(ERROR);
	}
	
	/**
	 * get all available data type names
	 * @param isSort : sort the dataTypes alphabetically
	 * @returns {Array} Strings array of dataType names
	 */
	this.getTypes = function(isSort)
	{
		/*
		var types = [];
		if(Array.prototype.map)
		{
			types = this.types.dataTypes.map(function(dt){return dt.name;});
		}
		else
		{
			var dt;
			for (dt in this.types.dataTypes)
			{
				if(this.types.dataTypes[dt].name)
					types.push(this.types.dataTypes[dt].name);
			}
		}
		if(isSort) types.sort();
		return types;
		*/
		var s = "<<splitter>>";							// custom splitter 
		var typesArray = this.names.join(s).split(s);	// a "DEEP" copy
		if(isSort) typesArray.sort();
		return typesArray;
	};
	
	/**
	 * @param	{String} dataType name
	 * @returns	{Object} A single dataType object, the default dataType will be returned if not found
	*/
	this.getType = function(dataType)
	{
		var dt;
		var i = this.getTypes().indexOf(dataType);
		if(i>=0)
		{
			dt = this.types.dataTypes[i];
		}
		else
		{
			dt = this.defualtDataType.dataTypes[0];
			console.warn(dataType + " was not found!\nDefault data type used instead." );
		}
		
		// set override and custom function
		dt.toString		= customDataTypeToString;
		dt.toXml		= toXml;
		dt.toXmlString	= toXmlString;
		
		return dt;
	}
	
	/**
	 * @param	{String} dataType name
	 * @param	{String} pattern property name
	 * @returns {RegExp} pattern, the default property name pattern will be returned if dataType not found 
	 */
	this.getRegexPattern = function(dataType, regexPropertyName)
	{
		var re;
		var i = this.getTypes().indexOf(dataType);
		if(i>=0)
		{
			var reStr = this.types.dataTypes[i][regexPropertyName];
			re = new RegExp(reStr,"g");
		}
		else
		{
			re = this.defualtDataType.dataTypes[0][regexPropertyName];
			console.warn(dataType + " was not found!\nDefault data type used instead." );
		}
		return re;
	};
	
	/**
	 * @param	{String} dataType name
	 * @returns {RegExp} invalidChars pattern, the default invalidChars pattern will be returned if dataType not found 
	 */
	this.getInvalidChars = function(dataType)
    {
	    return this.getRegexPattern(dataType, this.invalidCharsPropName);
    };
	
    /**
	 * @param	{String} dataType name
	 * @returns {RegExp} validPattern pattern, the default validPattern pattern will be returned if dataType not found 
	 */
	this.getValidPattern = function(dataType)
	{
	    return this.getRegexPattern(dataType, this.validPatternPropName);	
	};
	
    /**
	 * @param	{String} dataType name
	 * @returns {RegExp} validValuePattern pattern, the default validValuePattern pattern will be returned if dataType not found 
	 */
	this.getValidValuePattern = function(dataType)
	{
	    return this.getRegexPattern(dataType, this.validValuePatternPropName);	
	};
	
	/**
	 * @returns {Boolean} true if an error occured during load process  
	 */
	this.isError = function()
	{
		return (this.readyState == ERROR);
	};
	
	/**
	 * @returns {Boolean} is dataTypes object in init status
	 */
	this.isInit = function()
	{
		return (this.readyState == INIT);
	};

	/**
	 * @returns {Boolean} is dataTypes object ready, load completed successfully  
	 */
	this.isReady = function()
	{
		return (this.readyState == READY);
	};
	
	/**
	 * @returns {Boolean} is dataTypes object in default state  
	 */
	this.isDefault = function()
	{
		return (this.readyState == DEFAULT);
	};
	
	/**
	*
	*/
	this.setReadyState = function(readyState)
	{
		this.readyState = readyState;
		this.readyStateChange();
	}
	
	/**
	 * fires onStateCange callback function
	 */
	this.readyStateChange = function()
    {
		if(isFunction(this.onReadyStateChange))
		{
			this.onReadyStateChange();
		}
    };
	
    /**
     * Revert the dataTypes object to default "safe" state.
     * Called on async-ajax load or on parsing error 
     */
	this.setDefault = function()
	{
		this.types = this.defualtDataType;
		this.setResetNames();
		this.addName(this.types.dataTypes[0].name);
		this.setReadyState(DEFAULT);
	};
	
	/**
	 * add dataType name to names index array
	 */
	this.addName = function(name)
	{
		this.names.push(name);
	};
	
	/**
	 * reset/revert the names array
	 */
	this.setResetNames = function()
	{
		this.names = [];
	};
	
	/**
	 * @param	{String}	dataType name
	 * @param	{String}	input to be validated
	 * @returns	{Boolean}	true if input value conforms to white-list chars  
	 */
	this.isValidInput = function(dataType, input)
    {
		var re = this.getInvalidChars(dataType);
		return !( re.test(input) );
    };

	/**
	 * @param	{String}	dataType name
	 * @param	{String}	input to be validated
	 * @returns	{Boolean}	true if input value conforms to the defined pattern/format  
	 */
	this.isValidValue = function(dataType, value)
    {
		var re = this.getValidPattern(dataType);
    	return ( re.test(value) );
    };
	
	/**
	 *
	 */
	this.addType = function(newName, newInvalidChars, newValidPattern, newValidValuePattern, newFormatDesc)
	{
		var result;
		try
		{
			if	(!isNonZeroLengthString(newName))
			{
				throw "Invalid datatype name";
			}
			
			if(this.getTypes().indexOf(newName) >= 0)
			{
				throw "Datatype name must be unique";
			}
			
			if	( isNonZeroLengthString(newInvalidChars) )
			{
				new RegExp(newInvalidChars,"g");
			}
			else
			{
				throw "Invalid datatype " + this.invalidCharsPropName + " pattern: " + newInvalidChars;
			}
			
			if ( isNonZeroLengthString(newValidPattern) )
			{
				new RegExp(newValidPattern,"g");
			}
			else
			{
				throw "Invalid datatype " + this.validPatternPropName + " pattern: " + newValidPattern;
			}
			
			if ( isNonZeroLengthString(newValidValuePattern) )
			{
				new RegExp(newValidValuePattern,"g");
			}
			else
			{
				throw "Invalid datatype " + this.validValuePatternPropName + " pattern: " + newValidValuePattern;
			}	
			
			var newType								= {};
			newType[this.namePropName]				= newName;
			newType[this.invalidCharsPropName]		= newInvalidChars;
			newType[this.validPatternPropName]		= newValidPattern;
			newType[this.validValuePatternPropName]	= newValidValuePattern;
			newType[this.dataTypeFormatDescPropName]= isNull(newFormatDesc)?"":newFormatDesc;
			
			newType.toString						= customDataTypeToString;
			newType.toXml							= toXml;
			newType.toXmlString						= toXmlString;
			
			this.types.dataTypes.push(newType);
			
			this.addName(newName);
			
			result = newType;
		}
		catch(ex)
		{
			result = ex;
			console.error(ex);
		}
		return result;
	};
    
	/**
	 * 
	 */
	this.toString = function()
	{
		var str ="";
		
		try
		{
			str = JSON.stringify(this.types);
		}
		catch(ex) // JSON not defined
		{
			str += '{\n"' + this.dataTypesPropName + '":[';
			
			for(var i in this.types.dataTypes)
			{
				str += this.types.dataTypes[i] + ",";
			}
			str = str.substring(0, str.length-1); // remove last comma
			str += ']\n}';
		}
		
		return str;
	}
	
	/*
	*
	*/
	this.toXml = function()
	{
		var xmlDoc = document.createElementNS(XML_NS, XNL_ROOT_NAME);
		
		for(var i in this.types.dataTypes)
		{
			xmlDoc.appendChild( this.types.dataTypes[i].toXml() );
		}
		
		return xmlDoc;
	}
	
	/**
	 * 
	 */
	this.toXmlString = toXmlString;
	
	/*
	*
	*/
	this.isJsonStr = function(str)
	{
		var jsonStrRe	= /\{([\s\S])*?dataTypes([\s\S])*\]([\s\S])*?\}\;?/gim;
		var isJsonStr	= jsonStrRe.test(str);
		
		return isJsonStr;
	}
	
	/*
	*
	*/
	this.isXmlStr = function(str)
	{
		var xmlStrRe	= /(<)(dataTypes>)[\s\S]+\1(\/)\2/gim;
		var isXmlStr	= xmlStrRe.test(str);
		
		return isXmlStr;
	}
	
	/*
	*
	*/
	this.objectType = function(obj)
	{
		var result = UNHANDLED_TYPE;
		if(!isNull(obj))
		{
			if(obj.documentElement)
			{
				if(	obj.documentElement.nodeName == XNL_ROOT_NAME &&
					obj.documentElement.firstChild.nodeName == DATA_TYPES_PROP_NAME)
				{
					result =  XML_TYPE;
				}
			}
			else if(obj[DATA_TYPES_PROP_NAME])
			{
				result =  JSON_TYPE;
			}
		}
		return result;
	}
	
	/**
	 * 
	 */
	this.loadJSON = function(jsonIn)
	{
		var json;
		
		if( isString(jsonIn) )
		{
			this.setReadyState(PARSING);
			
			if(this.isJsonStr(jsonIn))
			{
				try
				{
					if(JSON || window.JSON)
						json = JSON.parse(jsonIn);
					else
						json = eval(jsonIn);
				}
				catch(ex)
				{
					//TODO: set error
					this.setError(2, "Failed to parse JSON string", ex);
					return;
				}
			}
			else // not a json string
			{
				//TODO: set error
				this.setError(3, "The string source is not a valid dataTypes JSON");
				return;
			}
		}
		else if(this.objectType(jsonIn)==JSON_TYPE)
		{
			json = jsonIn;
		}
		else // unknown object
		{
			//TODO: set error
			this.setError(4, "Invalid JSON object");
			return;
		}
		
		try
		{
			this.setReadyState(VALIDATING);
			// validate JSON
			tv4.dropSchemas();
			tv4.reset();
			this.dataTypesValidated = tv4.validate(json, dtSchema);
			
			if(this.dataTypesValidated)
			{
				this.validationError = null;
				this.types = json;
				this.setResetNames(); // reset the names array
				
				// validate regexp patterns
				for ( var i in this.types.dataTypes)
				{
					if(	validateRegExpPattern(this.types, i, this.invalidCharsPropName)
						&&
						validateRegExpPattern(this.types, i, this.validPatternPropName)
						&&
						validateRegExpPattern(this.types, i, this.validValuePatternPropName)
						)
					{
						this.addName(this.types.dataTypes[i].name);
						
						// TODO: move set functions to function
						this.types.dataTypes[i].toString	= customDataTypeToString;
						this.types.dataTypes[i].toXml		= toXml;
						this.types.dataTypes[i].toXmlString	= toXmlString;
					}
					else
					{
						console.warn("Invalid RegExp, the following dataType was removed!",this.types.dataTypes[i]);
						this.removedName.push(this.types.dataTypes[i].name);
						this.types.dataTypes.splice(i, this.removeOneNode);
					}
				}
				
				this.setReadyState(READY);
			}
			else
			{
				this.validationError = tv4.error;
				
				//TODO: set error
				this.setError(4, "Failed to validate source", this.validationError);
				return;
			}
		}
		catch (ex)
		{
			this.dataTypesValidated = false;
			//TODO: set error
			this.setError(5, "Unexpected error", ex);
			console.error(ex);
		}
	}
	
	/**
	 * 
	 */
	this.loadXML = function(xmlIn)
	{
		var xmlDoc;
		if( isString(xmlIn) )
		{
			this.setReadyState(PARSING);
			
			if(this.isXmlStr(xmlIn))
			{
				xmlDoc = loadXMLString(xmlIn);
			}
			else
			{
				//TODO: set error
				this.setError(6, "The string source is not a valid dataTypes XML");
				return;
			}
		}
		else
		{
			xmlDoc = xmlIn;
		}
		
		if (this.objectType(xmlDoc)!=XML_TYPE) // the object is a XML DOM
		{
			//TODO: set error
			this.setError(7, "Invalid XML object");
			return;
		}
		else
		{
			var json = xmlToJson(xmlDoc);
			
			if( json[XNL_ROOT_NAME] && json[XNL_ROOT_NAME][DATA_TYPES_PROP_NAME] )
			{	
				json = json[XNL_ROOT_NAME];
				this.loadJSON(json);
			}
			else
			{
				//TODO: set error
				this.setError(8, "Invalid XML DOM to JSON conversion");
				return;
			}
		}
	}
	
	/**
	 * 
	 */
	this.loadResponse = function(response)
	{
		if(this.isXmlStr(response) || (this.objectType(response)==XML_TYPE) )
		{
			this.loadXML(response);
		}
		else if(this.isJsonStr(response) || (this.objectType(response)==JSON_TYPE))
		{
			this.loadJSON(response);
		}
		else // unhandled response
		{
			//TODO: set error
			this.setError(8, "Ajax response failed");
		}
	}
	
	/**
	*
	*/
	this.load = function(input, stateChangeCallback)
	{
		if(isFunction(stateChangeCallback))
		{
			this.onReadyStateChange = stateChangeCallback;
		}
		
		if(this.isXmlStr(input) || (this.objectType(input)==XML_TYPE) )
		{
			this.loadXML(input);
		}
		else if(this.isJsonStr(input) || (this.objectType(input)==JSON_TYPE))
		{
			this.loadJSON(input);
		}
		else if (isNonZeroLengthString(input))
		{
			// input is a URL
			this.setReadyState(LOADING);
			getJsonStringFromURL(this, input);
			this.dataTypesValidated = false;
			console.log("Loading URL: " + input);
		}
		else // unhandled response
		{
			//TODO: set error
			this.setError(1, "Invalid source");
			return;
		}
	}
	
	/**
	 * 
	 */
	this.load_old = function(input, stateChangeCallback)
	{
		if(isFunction(stateChangeCallback))
		{
			this.onReadyStateChange = stateChangeCallback;
		}
		
		try
		{
			if ( isString(input) )
			{
				/**
				 * basic validation that the dataType string input 
				 * format is either a JSON or XML
				 * full validation will be done using a tv4 schema
				 */
				var jsonStrRe	= /\{([\s\S])*?dataTypes([\s\S])*\]([\s\S])*?\}\;?/gim;
				var xmlStrRe	= /(<)(dataTypes>)[\s\S]+\1(\/)\2/gim;
				var isJsonStr	= jsonStrRe.test(input);
				var isXmlStr	= xmlStrRe.test(input);
				
				if(isJsonStr || isXmlStr)
				{
					this.setReadyState(PARSING);
					
					if(isXmlStr) // the string is an XML
					{
						input = xmlToJson(loadXMLString(input));
						for(var objName in input)
						{
							if(input[objName].dataTypes) // objName should be equal to XNL_ROOT_NAME
							{
								input = input[objName];
								break;
							}
						}
					}
					else
					{
						input = JSON.parse(input);
					}
				}
				else if (isNonZeroLengthString(input))
				{
					// input is a URL
					this.setReadyState(LOADING);
					getJsonStringFromURL(this, input);
					this.dataTypesValidated = false;
					console.log("Loading URL: " + input);
				}
				else
				{
					throw "Input is invalid or zero length string!";
				}
			}
			
			//if(this.status != this.loading)
			//{	
				// validate non-null input
				if(!isNull(input))
				{
					if (input.xmlVersion) // the object is a XML DOM
					{
						input = xmlToJson(input);
					}
					
					try
		            {
						this.setReadyState(VALIDATING);
		    			// validate JSON
						tv4.dropSchemas();
						tv4.reset();
						this.dataTypesValidated = tv4.validate(input, dtSchema);
		            }
		            catch (e)
		            {
						this.dataTypesValidated = false;
		            	console.error(e);
		            }
				}
				else
				{
					throw "Input is null or undfined.";
				}
				
	            if(this.dataTypesValidated)
	            {
					this.validationError = null;
					this.types = input;
					this.names.length = 0; // reset the names array
					
					// validate regexp patterns
					for ( var i in this.types.dataTypes)
					{
						if(	validateRegExpPattern(this.types, i, this.invalidCharsPropName)
							&&
							validateRegExpPattern(this.types, i, this.validPatternPropName)
							)
						{
							this.addName(this.types.dataTypes[i].name);
							
							this.types.dataTypes[i].toString	= customDataTypeToString;
							this.types.dataTypes[i].toXml		= toXml;
							this.types.dataTypes[i].toXmlString	= toXmlString;
						}
						else
						{
							console.warn("Invalid RegExp, the following dataType was removed!",this.types.dataTypes[i]);
							this.removedName.push(this.types.dataTypes[i].name);
							this.types.dataTypes.splice(i, this.removeOneNode);
						}
					}
					
					this.setReadyState(READY);
				}
				else if(!this.dataTypesValidated && this.status != this.loading)
				{
					this.validationError = tv4.error;
					throw "Input failed to validate!";
				}
			//}
		}
		catch (e)
		{
			console.error("Default data type will be used!", e, this.status, input);
			this.setDefault();
			this.setReadyState(ERROR);
		};
	};
	
	this.init();
	
	if(!isNull(input))
		this.load(input, stateChange);
	else
		this.setDefault();
};

function validateRegExpPattern(types, dt, rePropName)
{
	var result = false;
	var reStr = -1;
	try
	{
		var re = new RegExp();
		reStr = types.dataTypes[dt][rePropName];
		if(isString(reStr))
		{
			re.compile(reStr, "g");
			result = true;
		}
	}
	catch (e)
	{
		console.warn(e, reStr);
	}
	return result;
}

function customDataTypeToString()
{
	var str ="";
	
	try
	{
		str = JSON.stringify(this);
	}
	catch(ex) // JSON not defined
	{
		var re = /(\\)/g;
		str += "{\n";
		
		for(var i in this)
		{
			if(isString(this[i]))
			{
				str += '"' + i + '":"' + this[i].replace(re,"$1$1") + '",\n';
			}
		}
		str = str.substring(0, str.length-2);
		str += "\n}";
	}
	
	return str;
}

function toXml()
{
	var xmlDoc = document.createElementNS(XML_NS, DATA_TYPES_PROP_NAME);
	var node;
	
	for(var i in this)
	{
		if(isString(this[i]))
		{
			node = document.createElementNS(XML_NS,i);
			node.appendChild( document.createTextNode( this[i] ) );
			
			xmlDoc.appendChild(node);
		}
	}
	
	return xmlDoc;
}

function toXmlString()
{
	var str = "Xmlserializer not supported";
	var patt = '(\\sxmlns="' + XML_NS + '")'
	var re = new RegExp (patt,"gi");
	
	if(XMLSerializer)
	{
		// Gecko- and Webkit-based browsers (Firefox, Chrome), Opera.
		str = (new XMLSerializer()).serializeToString( this.toXml() );
	}
	else
	{
		try
		{
			// Internet Explorer.
			str = this.toXml().xml;
		}
		catch(ex)
		{
			console.error(ex);
		}
	}
	
	str = str.replace(re,"");
	return str;
}

function AjaxRequest(dataTypesObj)
{ 
	var obj;
	try
	{
		var AXO = (window.ActiveXObject);
		if (AXO)
		{
			// Test for support for ActiveXObject in IE first (as XMLHttpRequest in IE7 is broken)
			var activexmodes = [ "Msxml2.XMLHTTP", "Microsoft.XMLHTTP" ]; // activeX versions to check for in IE
			for ( var i = 0; i < activexmodes.length; i++)
			{
				obj = new ActiveXObject(activexmodes[i]);
			}
			//obj = new ActiveXObject("Microsoft.XMLHTTP");
		}
		else if (window.XMLHttpRequest) // if Mozilla, Safari etc
		{
			obj = new XMLHttpRequest();
		}
		
		//((AXO) ? AXO : XMLHttpRequest).prototype.dataTypesObj = dataTypesObj;
	}
	catch (e)
	{
		console.error(e);
	}
	return obj;
}
function getParams(e)
{
	var str = "";
	if(e)
	{
		/*if(JSON)
		{
			str = JSON.stringify(e);
		}
		else
		{*/
			str += "{"; 
			for(var idx in e)
			{
				str += '"' + idx + '":';
				/*if(e[idx] instanceof Object)
				{
					str += getParams(e[idx]);
				}
				else
				{*/
					str += '"'+ e[idx]+'"';
				//}
				str += ',';
			}
			str = str.substring(0, str.length-1);
			str += "\n}"; 
			
		//}
		str = str.replace(/("|null|false|true)(,)(")/gim,'",$1$2\n$3"');
	}
	return str;
}

function getJsonStringFromURL(dataTypesObj, url)
{	
	try
	{
		var ajaxRequest = new AjaxRequest(dataTypesObj);
			
		ajaxRequest.onerror = function(e)
		{
			window.dto.setError(11, "Error loading remote source", getParams(e));
		};
			
		ajaxRequest.ontimeout = function()
		{
			window.dto.setError(12, "The remote load request timedout", this.statusText);
		};
		
		ajaxRequest.onreadystatechange = function(e)
		{
			//console.log("this.readyState:", this.readyState, "\ne:", getParams(e));
			if (this.readyState == this.DONE) //(ajaxRequest.readyState == 4)
			{
				if (this.status == 200) // || window.location.href.indexOf("http") == -1)
				{
	//				var response = this.responseText;
	//				window.dto.load(response);
					window.dto.loadResponse(this.responseText);
				}
				else
				{
					window.dto.setError(13, "Error processing request: " + this.statusText + " (" + this.status + ")");
					//console.log("Error", ajaxRequest.status, ajaxRequest.statusText);
				}
			}
		};
		ajaxRequest.open("GET", url, true);
		ajaxRequest.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
		ajaxRequest.setRequestHeader("Cache-Control", "no-cache");
		ajaxRequest.send(null);
	}
	catch(ex)
	{
		window.dto.setError(10, "Error sending remote source request", ex);
		//console.error(ex);
	}
}

function genericEventHandler(e)
{
	var isValid = isHandeledEvent(e);
	
	if(!window.dto)
	{
		// loop throgh window scope variable collection and find the DataTypes object
		for ( var i in window )
		{
			if(window[i] instanceof DataTypes)
			{
				window.dto = window[i];
				break;
			}
			//console.log(i, typeof window[i], window[i]);
		}
	}
	
	// continue validation only if isHandeledEvent and DataTypes object was found and is ready
	if(isValid && window.dto && window.dto.isReady())
	{
		// isValid = eval(e.type + "Handler(e)"); // shorther, but UGLY
		var eType = (e.type).trim().toLowerCase();
		switch(eType)
		{
			case DROP:
				isValid = dropHandler(e);
				break;
			case PASTE:
				isValid = pasteHandler(e);
				break;
			case KEYPRESS:
				isValid = keypressHandler(e);
				break;
			default:
				isValid = false;
				break;
		}
	}
	return isValid;
}

/**
 * 
 * @param evt
 * @returns
 */
function EventHandlerObject(evt)
{
	this.e					= (evt) ? evt : window.event;
	this.eventType			= this.e.type;
	this.obj				= (this.e.target) ? this.e.target : this.e.srcElement;
	this.caretPos			= getCaretPosition (this.obj);
	this.sourceValue		= this.obj.value;
	this.selectedText		= getSelectedText(); 
	this.sourceValueStart	= this.sourceValue.substring(0,this.caretPos); 							// unselected source up to selection start
	this.dataType			= this.obj.getAttribute(DATA_TYPE_ATTRIBUTE_NAME);
	this.isPostValidate		= eval(this.obj.getAttribute(POST_EVENT_VALIDATION_ATTRIBUTE_NAME));
	this.isDeleteInvalid	= eval(this.obj.getAttribute(DELETE_INVALID_CHARS_ATTRIBUTE_NAME)); 					// relevant for paste event
	
	//this.regexPattern		= validationRegExpPattern(this.dataType);
	this.dto				= window.dto;
	
	//this.temp				= "";
	
	switch (this.eventType)
    {
		case PASTE:
			this.sourceValueEnd		= this.sourceValue.substring(this.caretPos+this.selectedText.length);	// unselected source from selection end
			
			if(!isNull(this.obj))
			{
				if (window.clipboardData && window.clipboardData.getData)
				{ // IE
					this.temp		= window.clipboardData.getData("Text");
				}
				else if (this.e.clipboardData && this.e.clipboardData.getData)
				{
					this.temp		= this.e.clipboardData.getData("text/plain");
				}
			}
			
			break;
			
		//-----------------------------
		case DROP:
			this.sourceValueEnd		= this.sourceValue.substring(this.caretPos);	// unselected source from selection end
			this.temp 				= this.e.dataTransfer.getData("Text")
			
			break;
			
		//-----------------------------
    	case KEYPRESS:

    		this.sourceValueEnd	= this.sourceValue.substring(this.caretPos+this.selectedText.length);	// unselected source from selection end
			this.eWhich			= (this.e.which) ? this.e.which : 0;
			this.eKeyCode		= this.e.keyCode;
			this.eCharCode		= this.e.charCode;
			this.key 			= (this.eWhich == this.eKeyCode && this.eWhich == this.eCharCode) ? this.eWhich
									: (!this.eWhich && typeof this.eCharCode == "undefined") ? this.eKeyCode
											: (this.eWhich == this.eCharCode) ? this.eCharCode
													: (this.eWhich != this.eKeyCode) ? this.eWhich
																: 0;
			//if(this.key)
				this.temp		= String.fromCharCode(this.key);
			break;
			
		//-----------------------------
    	default:
    		console.warn("Un-handled event: " + this.eventType);
    		break;
    }
	
	// functions
	// -----------------------------------------
	
	this.cancelDefaultEventBehaviour = function()
	{	
		if(this.e.preventDefault)
		{
			this.e.stopPropagation();
			this.e.preventDefault();
		}
		else
		{
			this.e.returnValue = false;
		}
	};
	
	this.isValidInput = function()
	{
		return this.dto.isValidInput(this.dataType, this.temp);
	};
	
	this.isValidValue = function()
	{
		return this.dto.isValidValue(this.dataType, this.tempValue());
	};
	
	this.tempValue = function()
	{
		return this.sourceValueStart + this.temp + this.sourceValueEnd;
	};
	
	this.deleteInvalidChars = function()
	{
		var re				= this.dto.getInvalidChars(this.dataType);
		this.temp			= this.temp.replace( re, "" );
		this.e.tempValue	= this.tempValue();
	};
	
	// add calculated values to the event object
	// -----------------------------------------
	evt.caretPosition		= this.caretPos;
	evt.sourceValue			= this.sourceValue;
	evt.sourceValueFront	= this.sourceValueStart;
	evt.sourceValueEnd		= this.sourceValueEnd;
	evt.value				= this.temp;
	evt.tempValue			= this.tempValue();
}

/**
 * 
 * @param	{Event Object} evt
 * @returns	{Boolean}
 */
function pasteHandler(evt)
{
	var result	= false;
	var eho		= new EventHandlerObject(evt);
	
	eho.cancelDefaultEventBehaviour();
	
	result = eho.isValidInput();
	
	if(result && eho.isPostValidate)
	{
		result = eho.isValidValue();
	}

	if(!result && eho.isDeleteInvalid)
	{
		eho.deleteInvalidChars();
		result = eho.isValidValue(); // need to re-validate format after deletion of invalid chars
	}
	
	if(result)
	{
		eho.obj.value = eho.tempValue();
		setCaretPosition(eho.obj, eho.caretPos+eho.temp.length);
	}
	return result; 
}

/**
 * 
 * @param	{Event Object} evt
 * @returns	{Boolean}
 */
function dropHandler(evt)
{
	 return pasteHandler(evt);
}

/**
 * 
 * @param evt
 * @returns {Boolean}
 */
function keypressHandler(evt) 
{
	var eho		= new EventHandlerObject(evt);
	var result	= eho.e.ctrlKey || eho.key <= 13; // if ctrl modifier or ENTER,DEL,BACKSPACEis pressed ignore key-press event by returning true 
	
	if(!result)
	{
		result = eho.isValidInput(); // || eho.key==10 || eho.key==13 || eho.key==0; // key equals zero only in FF for UP, DOWN, LEFT or RIGHT arrow is pressed as well as DEL, HOME, END, ESC, BACKSPACE etc
		
		eho.cancelDefaultEventBehaviour(); // for FF don't preventDefault() if the key pressed is DELETE/BACKSPACE etc.
		
		if(result && eho.isPostValidate)
		{
			result = eho.isValidValue();
		}
		
		if(result)
		{
			eho.obj.value = eho.tempValue();
			setCaretPosition(eho.obj, eho.caretPos+eho.temp.length);
		}
	}
	
	return result;
}

// utils
// -------------------------------------------


function getCaretPosition(obj)
{
	var caretPos = 0;
	var selectedRange;
	var selectedRangeLen;
	
	if (document.selection)													// IE Support
	{	
		obj.focus();														// Set focus on the element
		selectedRange		= document.selection.createRange();				// To get cursor position, get empty selection range
		selectedRangeLen	= selectedRange.text.length; 					// get the selection length
		selectedRange.moveStart ("character", -obj.value.length);			// Move selection start to 0 position
		caretPos			= selectedRange.text.length-selectedRangeLen;	// The caret position is set to the start of the of the selection
	}
	else if (obj.selectionStart || obj.selectionStart == "0")				// FireFox support
	{
		caretPos = obj.selectionStart;
	}
	
	return (caretPos); // Return results
}

/**
 * 
 * @param obj
 * @param caretPos
 */
function setCaretPosition(obj, caretPos)
{
	if (obj)
	{
		if (obj.createTextRange)
		{
			var range = obj.createTextRange();
			range.move("character", caretPos);
			range.select();
		}
		else
		{
			if (obj.selectionStart || obj.setSelectionRange)
			{
				obj.focus();
				obj.setSelectionRange(caretPos, caretPos);
			}
			else
				obj.focus();
		}
	}
}

/**
 * 
 * @returns {String}
 */
function getSelectedText()
{
	var gS				= "getSelection";
	var selectedText	= "";
	
	if(window[gS])
		selectedText = window[gS]().toString();
	else if(document[gS])
		selectedText = document[gS].toString();
	else
		selectedText = document.selection.createRange().text;
	
	return selectedText;
}

function isNull(input)
{
	var myNull;
	return (typeof input === typeof myNull);
}


function isFunction(testFuction)
{
	return (typeof testFuction === typeof isFunction);
}

function isString(input)
{
	var str = "str";
	return (typeof input === typeof str);
}

function isNonZeroLengthString(input)
{
	return isString(input) && (input.length > 0);
}

function isEvent(obj)
{
	/*
	var isEvent = false;
	if(obj && obj.type) // IE 9+ support
	{
		return isEvent = true;
	}
	else
	{
		var regExpPattern	= /event/gi;
		var str				= obj + "";
		isEvent = regExpPattern.test(str); 
	}
	return isEvent;
	*/
	return (obj && obj.type);
}

function isHandeledEvent(e)
{
	var isHandeledEvent = false;
	if(isEvent(e))
	{
		var regExpPattern = new RegExp(HANDLED_EVENTS_ARR.join("|"),"gi") // /paste|keypress|drop/gi;
		isHandeledEvent = regExpPattern.test(e.type); 
	}
	return isHandeledEvent;
}

//from URL: http://stackoverflow.com/questions/7769829/tool-javascript-to-convert-a-xml-string-to-json

function xmlToJson(xml)
{
    var obj = {};
    if (xml.nodeType == 1)
	{                
        if (xml.attributes.length > 0)
		{
            obj["@attributes"] = {};
            for (var j = 0; j < xml.attributes.length; j++)
			{
                var attribute = xml.attributes.item(j);
                obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
            }
        }
    }
	else if (xml.nodeType == 3)
	{ 
        obj = xml.nodeValue;
    }            
    if (xml.hasChildNodes())
	{
        for (var i = 0; i < xml.childNodes.length; i++)
		{
            var item = xml.childNodes.item(i);
            var nodeName = item.nodeName;
			var typeOfObj = typeof (obj[nodeName]);
			if(nodeName == "#text")
			{
				obj = item.nodeValue;
			}
            else if (typeOfObj == "undefined")
			{
                obj[nodeName] = xmlToJson(item);
            }
			else
			{
                if (typeof (obj[nodeName].push) == "undefined")
				{
                    var old = obj[nodeName];
                    obj[nodeName] = [];
                    obj[nodeName].push(old);
                }
                obj[nodeName].push(xmlToJson(item));
            }
        }
    }
    return obj;
}
// Implementation:
// var jsonText = JSON.stringify(xmlToJson(xmlDoc)); // xmlDoc = xml dom document

// from w3schools
// URL:

function loadXMLString(str) 
{
	var xmlStr = str.replace(/(\>|^)([\s\r\n]+)(\<|$)/gm,"$1$3");			// remove all white spaces - eliminate empty #text nodes for the XML2JSON convertor
	xmlStr = xmlStr.replace(/(<\?[\s\S]+?\?>)?([\s\S]*)(?=<dt)/gm, "$1");	// remove DTD declaration if any is present
	var xmlDoc;
	try
	{
		if (window.DOMParser)
		{
			var parser = new DOMParser();
			xmlDoc = parser.parseFromString(xmlStr,"text/xml");
		}
		else // Internet Explorer
		{
			xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
			xmlDoc.async = false;
			xmlDoc.loadXML(xmlStr); 
		}
	}
	catch(ex)
	{
		console.error(ex);
	}
	return xmlDoc;
}

/**
* Protect window.console method calls, e.g. console is not defined on IE
* unless dev tools are open, and IE doesn't define console.debug
*/
(function()
{
	if (!window.console)
	{
		window.console = {};
	}
	// union of Chrome, FF, IE, and Safari console methods
	var methods = [ "log", "info", "warn", "error", "debug", "trace", "dir", "group",
	        "groupCollapsed", "groupEnd", "time", "timeEnd", "profile",
	        "profileEnd", "dirxml", "assert", "count", "markTimeline",
	        "timeStamp", "clear" ];
	// define undefined methods as noops to prevent errors
	for ( var i = 0; i < methods.length; i++)
	{
		if (!window.console[methods[i]])
		{
			window.console[methods[i]] = function(){};
		}
	}
})();

/*
(function(o) {
    // keep old log method
    var _log = o.log;

    o.log = function(e) {
        alert(e);
        _log.call(o, e);
    }

}(console));
*/
