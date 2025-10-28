var gl = null;
var vao = null;
var program = null;
var vertexCount = 0;
var indexCount = 0;

var LIGHT_DIR = [1, 2, 0];
var BASE_COLOR = [.7, .7, .7];


// global vars for mouse interaction
var isDragging = false;
var startX, startY;
var leftMouse = false;
var zRotation = 0;
var xRotation = 0;
var zoom = 1;
var panX = 0;
var panZ = 0;

// more global vars
var canvas = null;
var renderReady = false;
var heightmapData = null;
var primitiveType = null;

// task 4, 0 = phong 1 = normal
var displayMode = 0;
var progPhong = null;
var progNorm = null;

// task 3 shaders
const vsNormal = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
uniform mat4 uModel, uView, uProj;
out vec3 vColor;
void main() {
	vec3 normalTransformed = mat3(uModel) * aNormal;
	vec3 normalNormalized = normalize(normalTransformed);
	vec3 colorFromNormal = 0.5 * normalNormalized + vec3(0.5, 0.5, 0.5);
	vColor = colorFromNormal;
	gl_Position = uProj * uView * uModel * vec4(aPos, 1.0);
}`;

const fsNormal = `#version 300 es
	precision highp float;
	in vec3 vColor;
	out vec4 fragColor;
	void main() { 
		fragColor = vec4(vColor, 1.0); 
	}`;


// task 4 shaders:
const vsPhong = `#version 300 es
	precision highp float;

	// position and normal
	layout(location=0) in vec3 aPos;
	layout(location=1) in vec3 aNormal;

	uniform mat4 uModel, uView, uProj;
	out vec3 vNormal;
	out vec3 vPos;

	void main() 
	{
		vNormal = mat3(uModel) * aNormal;
		vec4 posEye = uView * uModel * vec4(aPos, 1.0);
		vPos = posEye.xyz;
		gl_Position = uProj * posEye;
	}`;

const fsPhong = `#version 300 es
precision highp float;

// interpolated normal
in vec3 vNormal;

// interpolated position
in vec3 vPos;

// light direction
uniform vec3 uLightDir;

out vec4 fragColor;
void main() 
{
	// compute phong effect
	vec3 N = normalize(vNormal);
	vec3 L = normalize(uLightDir);
	vec3 V = normalize(-vPos);
	vec3 R = reflect(-L, N);

	float diffuse = max(dot(N, L), 0.0);
	float specular = pow(max(dot(R, V), 0.0), 16.0);

	vec3 color = vec3(0.2) 		// ambient
		+ diffuse * vec3(0.6, 0.8, 1.0) 
		+ specular * vec3(1.0);

	fragColor = vec4(color, 1.0);
}`;

function buildHeightMap(data, rows, cols, minmax=[0, 1]) 
{

	var vertices = [], indices = [], normals = [];

	
	// TODO: fill in vertices, normals, indices
	// then set renderReady
	//renderReady = true;

	console.log("buildHeightMap called with rows:", rows, "cols:", cols);

	// building height map
	for (var r = 0; r < rows; r++) {
		for (var c = 0; c < cols; c++) {
			var h = data[r * cols + c];

			var hNorm = (h - minmax[0]) / (minmax[1] - minmax[0]);

			var xPos = (c / cols) * 2 - 1;
			var zPos = (r / rows) * 2 - 1;
			var yPos = hNorm * 2 - 1;
			
			vertices.push(xPos, yPos, zPos);
			normals.push(0, 0, 0);
		}
	}

	for (var r = 0; r < rows - 1; r++) {
		for (var c = 0; c < cols - 1; c++) {
			var i = r * cols + c;
			indices.push(i, i + cols, i + 1);
			indices.push(i + 1, i + cols, i + cols + 1);
		}
	}

	// surface normals
	for (var i = 0; i < indices.length; i += 3) {
		// get triangle indices
		var i0 = indices[i] * 3;
		var i1 = indices[i + 1] * 3;
		var i2 = indices[i + 2] * 3;
		
		// get triangle vertices
		var v0 = [vertices[i0], vertices[i0 + 1], vertices[i0 + 2]];
		var v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
		var v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];

		// compute face normal
		var edge1 = subtract(v1, v0);
		var edge2 = subtract(v2, v0);
		var normal = cross(edge1, edge2);
		
		// accumulate normals for each vertex
		normals[i0] += normal[0];
		normals[i0 + 1] += normal[1];
		normals[i0 + 2] += normal[2];

		normals[i1] += normal[0];
		normals[i1 + 1] += normal[1];
		normals[i1 + 2] += normal[2];

		normals[i2] += normal[0];
		normals[i2 + 1] += normal[1];
		normals[i2 + 2] += normal[2];
	}

	for (var i = 0; i < normals.length; i += 3) {
		// normalize the normal
		var nx = normals[i];
		var ny = normals[i + 1];
		var nz = normals[i + 2];
		// normalize
		var n = normalize([nx, ny, nz]);
		// store back
		normals[i] = n[0];
		normals[i + 1] = n[1];
		normals[i + 2] = n[2];
	}

	console.log("Created", vertices.length / 3, "vertices and", indices.length / 3, "triangles");

	var vboPos = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vboPos);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	var vboNorm = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vboNorm);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

	var ibo = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);

	gl.bindVertexArray(vao);
	gl.bindBuffer(gl.ARRAY_BUFFER, vboPos);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, vboNorm);
	gl.enableVertexAttribArray(1);
	gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

	renderReady = true;
	indexCount = indices.length;
	primitiveType = gl.TRIANGLES;

	console.log("Heightmap built and ready for rendering.");
}

function processImage(img)
{
	// draw the image into an off-screen canvas
	var off = document.createElement('canvas');
	
	var sw = img.width, sh = img.height;
	off.width = sw; off.height = sh;
	
	var ctx = off.getContext('2d');
	ctx.drawImage(img, 0, 0, sw, sh);
	
	// read back the image pixel data
	var imgd = ctx.getImageData(0,0,sw,sh);
	var px = imgd.data;
	
	// create a an array will hold the height value
	var heightArray = new Float32Array(sw * sh);
	
	// loop through the image, rows then columns
	for (var y=0;y<sh;y++) 
	{
		for (var x=0;x<sw;x++) 
		{
			// offset in the image buffer
			var i = (y*sw + x)*4;
			
			// read the RGB pixel value
			var r = px[i+0], g = px[i+1], b = px[i+2];
			
			// convert to greyscale value between 0 and 1
			var lum = (0.2126*r + 0.7152*g + 0.0722*b) / 255.0;

			// store in array
			heightArray[y*sw + x] = lum;
		}
	}

	return {
		data: heightArray,
		width: sw,
		height: sw
	};
}

window.loadImageFile = function(event)
{

	var f = event.target.files && event.target.files[0];
	if (!f) return;

	// create a FileReader to read the image file
	var reader = new FileReader();

	if (f.name.toLowerCase().endsWith(".bsq")) 
	{
		reader.onload = (e) => {
 			var arrayBuffer = e.target.result;
 			var floatArray = new Float32Array(arrayBuffer);
 			var len = floatArray.length;
 			var sqrtLen = Math.sqrt(len);
 			if (Number.isInteger(sqrtLen)) 
 			{
 				// find min/max
 				var minD = Number.MAX_VALUE;
 				var maxD = -Number.MAX_VALUE;
 				for (var i=0; i<floatArray.length; i++) {
 					var x = floatArray[i];
 					if (minD > x) {
 						minD = x;
 					} else if (maxD < x) {
 						maxD = x;
 					}
 				}
 				heightmapData = {
 					data: floatArray,
					width: sqrtLen,
					height: sqrtLen,
					minmax: [minD, maxD]
				};
				buildHeightMap(
					heightmapData.data, 
					heightmapData.width, 
					heightmapData.height,
					heightmapData.minmax || [0, 1]
				);
 			}
 			else {
 				alert("The selected file has a Float32 size of " + len + ", which does not add up to a square image.");
 			}
		};
    	reader.readAsArrayBuffer(f);
	}
	else {
		reader.onload = function() 
		{
			// create an internal Image object to hold the image into memory
			var img = new Image();
			img.onload = function() 
			{
				// heightmapData is globally defined
				heightmapData = processImage(img);
				
				buildHeightMap(
					heightmapData.data, 
					heightmapData.width, 
					heightmapData.height
				);

				// flip the wireframe checkbox off
				document.querySelector("#wireframe").checked=false;
			};
			img.onerror = function() 
			{
				console.error("Invalid image file.");
				alert("The selected file could not be loaded as an image.");
			};

			// the source of the image is the data load from the file
			img.src = reader.result;
		};
		reader.readAsDataURL(f);
	}
}

function addMouseCallback(canvas)
{
	isDragging = false;

	canvas.addEventListener("mousedown", function (e) 
	{
		if (e.button === 0) {
			leftMouse = true;
		} else if (e.button === 2) {
			leftMouse = false;
		}

		isDragging = true;
		startX = e.offsetX;
		startY = e.offsetY;
	});

	canvas.addEventListener("contextmenu", function(e)  {
		e.preventDefault(); // disables the default right-click menu
	});


	canvas.addEventListener("wheel", function(e)  {
		e.preventDefault(); // prevents page scroll

		if (e.deltaY < 0) 
		{
			zoom *= 1.05;
		} else {
			zoom /= 1.05;
		}
	});

	document.addEventListener("mousemove", function (e) {
		if (!isDragging) return;
		var currentX = e.offsetX;
		var currentY = e.offsetY;

		var deltaX = currentX - startX;
		var deltaY = currentY - startY;

		if (leftMouse) {
			panX += deltaX * 0.01;
    		panZ += deltaY * 0.01;
		} else {
			zRotation += deltaX * 0.01;
			xRotation += deltaY * 0.01;
		}

		startX = currentX;
		startY = currentY;
	});

	document.addEventListener("mouseup", function () {
		isDragging = false;
	});

	document.addEventListener("mouseleave", () => {
		isDragging = false;
	});
}

function setupViewMatrix(eye, target)
{
    var forward = normalize(subtract(target, eye));
    var upHint  = [0, 1, 0];

    var right = normalize(cross(forward, upHint));
    var up    = cross(right, forward);

    var view = lookAt(eye, target, up);
    return view;

}


function draw()
{
	// TODO: add render code

	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clearColor(0.05, 0.05, 0.08, 1);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	if (renderReady) {
		
		if (displayMode == 0) {
			program = progPhong;
		} else {
			program = progNorm;
		}

		gl.useProgram(program);

		var uModel = gl.getUniformLocation(program, "uModel");
		var uView = gl.getUniformLocation(program, "uView");
		var uProj = gl.getUniformLocation(program, "uProj");
		

		var height = ((parseInt(document.querySelector("#height").value)/100 ));

		var modelMatrix = multiplyArrayOfMatrices([
			translateMatrix(panX, 0, panZ),
			rotateZMatrix(zRotation),
			rotateXMatrix(xRotation), 
			scaleMatrix(zoom, zoom * height, zoom)
		]);

		var view = lookAt([0, 2, 4], [0, 0, 0], [0, 1, 0]);
		var proj = perspectiveMatrix(Math.PI / 4, canvas.width / canvas.height, 0.1, 20);

		gl.uniformMatrix4fv(uModel, false, new Float32Array(modelMatrix));
		gl.uniformMatrix4fv(uView, false, view);
		gl.uniformMatrix4fv(uProj, false, proj);

		if (displayMode == 0) {
			// task 5
			var uLight = gl.getUniformLocation(program, "uLightDir");
			var lightDir = normalize([
				parseFloat(document.getElementById('lx').value),
				1.0,
				parseFloat(document.getElementById('lz').value)
			]);
			gl.uniform3fv(uLight, lightDir);
		}

		gl.bindVertexArray(vao);
		gl.drawElements(primitiveType, indexCount, gl.UNSIGNED_INT, 0);
	}

	requestAnimationFrame(draw);

}

window.setDisplayMode = function(mode)
{
	displayMode = mode;
	if (mode == 0) {
		program = progPhong;
	} else {
		program = progNorm;
	}
};

function initialize() 
{
	canvas = document.querySelector("#glcanvas");
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;

	gl = canvas.getContext("webgl2");

	// TODO: add initialization
	vao = gl.createVertexArray();
	gl.bindVertexArray(vao);


	var vertexShaderNorm = createShader(gl, gl.VERTEX_SHADER, vsNormal);
	var fragmentShaderNorm = createShader(gl, gl.FRAGMENT_SHADER, fsNormal);
	progNorm = createProgram(gl, vertexShaderNorm, fragmentShaderNorm);

	var vertexShaderPhong = createShader(gl, gl.VERTEX_SHADER, vsPhong);
	var fragmentShaderPhong = createShader(gl, gl.FRAGMENT_SHADER, fsPhong);
	progPhong = createProgram(gl, vertexShaderPhong, fragmentShaderPhong);

	if (displayMode == 0) {
		program = progPhong;
	} else {
		program = progNorm;
	}

	addMouseCallback(canvas);
	gl.enable(gl.DEPTH_TEST);

	window.requestAnimationFrame(draw);
}

window.onload = initialize;