(function() {

	var dfs = {"am_pm":["म.पू.","म.नं."],"day_name":["आयतार","सोमार","मंगळार","बुधवार","गुरुवार","शुक्रार","शेनवार"],"day_short":["आयतार","सोमार","मंगळार","बुधवार","गुरुवार","शुक्रार","शेनवार"],"era":["क्रिस्तपूर्व","क्रिस्तशखा"],"era_name":["क्रिस्तपूर्व","क्रिस्तशखा"],"month_name":["जानेवारी","फेब्रुवारी","मार्च","एप्रिल","मे","जून","जुलाय","आगोस्त","सप्टेंबर","ऑक्टोबर","नोव्हेंबर","डिसेंबर"],"month_short":["जानेवारी","फेब्रुवारी","मार्च","एप्रिल","मे","जून","जुलाय","आगोस्त","सप्टेंबर","ऑक्टोबर","नोव्हेंबर","डिसेंबर"],"order_full":"MDY","order_long":"MDY","order_medium":"MDY","order_short":"MDY"};
	var nfs = {"decimal_separator":".","grouping_separator":",","minus":"-"};
	var df = {SHORT_PADDED_CENTURY:function(d){if(d){return(((d.getMonth()+101)+'').substring(1)+'/'+((d.getDate()+101)+'').substring(1)+'/'+d.getFullYear());}},SHORT:function(d){if(d){return((d.getMonth()+1)+'/'+d.getDate()+'/'+(d.getFullYear()+'').substring(2));}},SHORT_NOYEAR:function(d){if(d){return((d.getMonth()+1)+'/'+d.getDate());}},SHORT_NODAY:function(d){if(d){return((d.getMonth()+1)+' '+(d.getFullYear()+'').substring(2));}},MEDIUM:function(d){if(d){return(dfs.month_short[d.getMonth()]+' '+d.getDate()+','+' '+d.getFullYear());}},MEDIUM_NOYEAR:function(d){if(d){return(dfs.month_short[d.getMonth()]+' '+d.getDate());}},MEDIUM_WEEKDAY_NOYEAR:function(d){if(d){return(dfs.day_short[d.getDay()]+' '+dfs.month_short[d.getMonth()]+' '+d.getDate());}},LONG_NODAY:function(d){if(d){return(dfs.month_name[d.getMonth()]+' '+d.getFullYear());}},LONG:function(d){if(d){return(dfs.month_name[d.getMonth()]+' '+d.getDate()+','+' '+d.getFullYear());}},FULL:function(d){if(d){return(dfs.day_name[d.getDay()]+','+' '+dfs.month_name[d.getMonth()]+' '+d.getDate()+','+' '+d.getFullYear());}}};
	
	window.icu = window.icu || new Object();
	var icu = window.icu;	
		
	icu.getCountry = function() { return "" };
	icu.getCountryName = function() { return "" };
	icu.getDateFormat = function(formatCode) { var retVal = {}; retVal.format = df[formatCode]; return retVal; };
	icu.getDateFormats = function() { return df; };
	icu.getDateFormatSymbols = function() { return dfs; };
	icu.getDecimalFormat = function(places) { var retVal = {}; retVal.format = function(n) { var ns = n < 0 ? Math.abs(n).toFixed(places) : n.toFixed(places); var ns2 = ns.split('.'); s = ns2[0]; var d = ns2[1]; var rgx = /(\d+)(\d{3})/;while(rgx.test(s)){s = s.replace(rgx, '$1' + nfs["grouping_separator"] + '$2');} return (n < 0 ? nfs["minus"] : "") + s + nfs["decimal_separator"] + d;}; return retVal; };
	icu.getDecimalFormatSymbols = function() { return nfs; };
	icu.getIntegerFormat = function() { var retVal = {}; retVal.format = function(i) { var s = i < 0 ? Math.abs(i).toString() : i.toString(); var rgx = /(\d+)(\d{3})/;while(rgx.test(s)){s = s.replace(rgx, '$1' + nfs["grouping_separator"] + '$2');} return i < 0 ? nfs["minus"] + s : s;}; return retVal; };
	icu.getLanguage = function() { return "kok" };
	icu.getLanguageName = function() { return "कोंकणी" };
	icu.getLocale = function() { return "kok" };
	icu.getLocaleName = function() { return "कोंकणी" };

})();