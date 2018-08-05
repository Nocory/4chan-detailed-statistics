const Entities = require('html-entities').Html5Entities
const entities = new Entities()

const post = {}
post.com = "P1000 sample pic.<br><br><span class=\"abbr\">[EXIF data available. Click <a href=\"javascript:void(0)\" onclick=\"toggle('exif1531746093698')\">here</a> to show/hide.]</span><br><table class=\"exif\" id=\"exif1531746093698\"><tr><td colspan=\"2\"><b>Camera-Specific Properties:</b></td></tr><tr><td colspan=\"2\"><b></b></td></tr><tr><td>Equipment Make</td><td>NIKON CORPORATION</td></tr><tr><td>Camera Model</td><td>COOLPIX Q15035</td></tr><tr><td>Maximum Lens Aperture</td><td>f/2.8</td></tr><tr><td colspan=\"2\"><b></b></td></tr><tr><td colspan=\"2\"><b>Image-Specific Properties:</b></td></tr><tr><td colspan=\"2\"><b></b></td></tr><tr><td>Exposure Time</td><td>1/50 sec</td></tr><tr><td>F-Number</td><td>f/5.0</td></tr><tr><td>ISO Speed Rating</td><td>400</td></tr><tr><td>Exposure Bias</td><td>0.3 EV</td></tr><tr><td>Metering Mode</td><td>Pattern</td></tr><tr><td>Light Source</td><td>Fine Weather</td></tr><tr><td>Flash</td><td>No Flash</td></tr><tr><td>Focal Length</td><td>108.00 mm</td></tr><tr><td>Rendering</td><td>Normal</td></tr><tr><td>Exposure Mode</td><td>Auto</td></tr><tr><td>White Balance</td><td>Manual</td></tr><tr><td colspan=\"2\"><b></b></td></tr></table>"

post.com = post.com.replace(/<span class="abbr">.+<\/table>/gms,"") //removes EXIF text from /p/ posts

post.com = post.com.replace(/<span class="deadlink">(?:&gt;)+(\/[a-z34]+\/)?\d+<\/span>/g,"$1") //remove deadlinks
post.com = post.com.replace(/<a href="(\/[a-z34]+\/)?.*?<\/a>/g,"$1")
post.com = post.com.replace(/<br>/gm," ") //replace linebreaks with a space
post.com = post.com.replace(/<.*?>/gm,"") //remove any other HTML tags; greentext-HTML, /g/ [code], etc., but its text-content is kept
post.com = entities.decode(post.com) //convert html entities to actual characters: "&gt;" becomes ">"
post.com = post.com.trim() //remove whitespace from start and end
post.com = post.com.toLowerCase()

console.log(post.com)