//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// Chapter 5: ColoredTriangle.js (c) 2012 matsuda  AND
// Chapter 4: RotatingTriangle_withButtons.js (c) 2012 matsuda
// became:
//
// ColoredMultiObject.js  MODIFIED for EECS 351-1, 
//                  Northwestern Univ. Jack Tumblin
//    --converted from 2D to 4D (x,y,z,w) vertices
//    --demonstrate how to keep & use MULTIPLE colored shapes in just one
//      Vertex Buffer Object(VBO). 
//    --demonstrate 'nodes' vs. 'vertices'; geometric corner locations where
//        OpenGL/WebGL requires multiple co-located vertices to implement the
//        meeting point of multiple diverse faces.
//
// Vertex shader program----------------------------------
var VSHADER_SOURCE = 
  'uniform mat4 u_ModelMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

// Fragment shader program----------------------------------
var FSHADER_SOURCE = 
//  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
//  '#endif GL_ES\n' +
  // 'uniform float u_Width;\n' +
  // 'uniform float u_Height;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  // 'gl_FragColor = vec4(gl_FragCoord.x/u_Width, 0.0, gl_FragCoord.y/u_Height, 1.0);\n' +
  '}\n';

// Global Variable -- Rotation angle rate (degrees/second)
var ANGLE_STEP = 45.0;
var ANGLE_STEP1 = 45;
var ANGLE_STEP2 = 90;
var floatsPerVertex = 7;
var isDrag=false;   // mouse-drag: true when user holds down mouse button
var xMclik=0.0;     // last mouse button-down position (in CVV coords)
var yMclik=0.0;   
var xMdragTot=0.0;  // total (accumulated) mouse-drag amounts (in CVV coords).
var yMdragTot=0.0; 
var xMdragTot1=0.0;
var xMdragTot1=0.0;
var xNewPoint=0.0;
var yNewPoint=0.0;
var isclick=true;
function main() {
//==============================================================================
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // 
  var n = initVertexBuffer(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }
  canvas.onmousedown  = function(ev){myMouseDown( ev, gl, canvas); }; 
  // canvas.onmousedown = function(ev){click(ev, gl, canvas, a_Position);};
            // when user's mouse button goes down call mouseDown() function
  canvas.onmousemove =  function(ev){myMouseMove( ev, gl, canvas) };
  
                      // call mouseMove() function          
  canvas.onmouseup =    function(ev){myMouseUp(   ev, gl, canvas)};

  // Next, register all keyboard events found within our HTML webpage window:
  window.addEventListener("keydown", myKeyDown, false);
  window.addEventListener("keyup", myKeyUp, false);
  window.addEventListener("keypress", myKeyPress, false);
  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel 
  // unless the new Z value is closer to the eye than the old one..
  //gl.depthFunc(gl.LESS);
  gl.enable(gl.DEPTH_TEST);     
  
  // Get handle to graphics system's storage location of u_ModelMatrix
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) { 
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }
  // Create a local version of our model matrix in JavaScript 
  var modelMatrix = new Matrix4();
  
  // Create, init current rotation angle value in JavaScript
  var currentAngle = 0.0;
  var Angle_sphere = 0.0;
  var moon_angle = 0.0;

//-----------------  

  // Start drawing: create 'tick' variable whose value is this function:
  var tick = function() {
    currentAngle = animate(currentAngle);  // Update the rotation angle
    Angle_sphere = animate_for_sphere(Angle_sphere);
    moon_angle = animate_for_moon(moon_angle)
    draw(gl, n, currentAngle, Angle_sphere,moon_angle, modelMatrix, u_ModelMatrix);   // Draw shapes
    
    console.log('currentAngle=',currentAngle);
    console.log('Angle_sphere=',Angle_sphere);
    requestAnimationFrame(tick, canvas);   
                      // Request that the browser re-draw the webpage
  };
  tick();  
  
}

function initVertexBuffer(gl) {
//==============================================================================
  var c30 = Math.sqrt(0.75);          // == cos(30deg) == sqrt(3) / 2
  var sq2 = Math.sqrt(2.0);            
  makeSphere();
  var box_tri = new Float32Array([
     0.0,  1.0, 0.0, 1.0,     1.0,  1.0,  1.0,  // Node 0
     0.0,  0.0, 1.0, 1.0,     0.0,  0.0,  1.0,  // Node 1
     1.0,  0.0, 0.0, 1.0,     1.0,  0.0,  0.0,  // Node 2
      // Face 1: (right side)
     0.0,  1.0, 0.0, 1.0,     1.0,  1.0,  1.0,  // Node 0
     1.0,  0.0, 0.0, 1.0,     1.0,  0.0,  0.0,  // Node 2
     0.0,  0.0, 0.0, 1.0,     0.0,  1.0,  0.0,  // Node 3
      // Face 2: (lower side)
     0.0,  1.0, 0.0, 1.0,     1.0,  1.0,  1.0,  // Node 0 
     0.0,  0.0, 0.0, 1.0,     0.0,  1.0,  0.0,  // Node 3
     0.0,  0.0, 1.0, 1.0,     0.0,  0.0,  1.0,  // Node 1 
      // Face 3: (base side)  
     0.0,  0.0,  0.0, 1.0,    0.0,  1.0,  0.0,  // Node 3
     1.0,  0.0,  0.0, 1.0,    1.0,  0.0,  0.0,  // Node 2
     0.0,  0.0,  1.0, 1.0,    0.0,  0.0,  1.0,  // Node 1
     ]);
  var box = new Float32Array([
  // Vertex coordinates(x,y,z,w) and color (R,G,B) for a color tetrahedron:
  //    Apex on +z axis; equilateral triangle base at z=0
/*  Nodes:
     0.0,  0.0, sq2, 1.0,     1.0,  1.0,  1.0,  // Node 0 (apex, +z axis;  white)
     c30, -0.5, 0.0, 1.0,     0.0,  0.0,  1.0,  // Node 1 (base: lower rt; red)
     0.0,  1.0, 0.0, 1.0,     1.0,  0.0,  0.0,  // Node 2 (base: +y axis;  grn)
    -c30, -0.5, 0.0, 1.0,     0.0,  1.0,  0.0,  // Node 3 (base:lower lft; blue)

*/
    //   // Face 0: (left side)
    //  0.0,  0.0, sq2, 1.0,     1.0,  1.0,  1.0,  // Node 0
    //  c30, -0.5, 0.0, 1.0,     0.0,  0.0,  1.0,  // Node 1
    //  0.0,  1.0, 0.0, 1.0,     1.0,  0.0,  0.0,  // Node 2
    //   // Face 1: (right side)
    //  0.0,  0.0, sq2, 1.0,     1.0,  1.0,  1.0,  // Node 0
    //  0.0,  1.0, 0.0, 1.0,     1.0,  0.0,  0.0,  // Node 2
    // -c30, -0.5, 0.0, 1.0,     0.0,  1.0,  0.0,  // Node 3
    //   // Face 2: (lower side)
    //  0.0,  0.0, sq2, 1.0,     1.0,  1.0,  1.0,  // Node 0 
    // -c30, -0.5, 0.0, 1.0,     0.0,  1.0,  0.0,  // Node 3
    //  c30, -0.5, 0.0, 1.0,     0.0,  0.0,  1.0,  // Node 1 
    //   // Face 3: (base side)  
    // -c30, -0.5, -0.0, 1.0,    0.0,  1.0,  0.0,  // Node 3
    //  0.0,  1.0, -0.0, 1.0,    1.0,  0.0,  0.0,  // Node 2
    //  c30, -0.5, -0.0, 1.0,    0.0,  0.0,  1.0,  // Node 1
     //Face 0: (left side)
     
 
    // // Cube Nodes
    //  0.0,  0.0,  0.0, 1.0 // Node 0
    //  0.0,  1.0,  0.0, 1.0 // Node 1
    //  1.0,  1.0,  0.0, 1.0 // Node 2
    //  1.0,  0.0,  0.0, 1.0 // Node 3
    
    //  1.0,  1.0,  1.0, 1.0 // Node 4
    //  0.0,  1.0,  1.0, 1.0 // Node 5
    //  0.0,  0.0,  1.0, 1.0 // Node 6
    //  1.0,  0.0,  1.0, 1.0 // Node 7

    // +x face: RED
     2.0,  0.0,  0.0, 1.0,    1.0, 0.0, 0.0,  // Node 3
     2.0,  2.0,  0.0, 1.0,    0.3, 0.0, 0.0,  // Node 2
     2.0,  2.0,  2.0, 1.0,    0.2, 0.0, 0.0,  // Node 4
     
     2.0,  2.0,  2.0, 1.0,    0.2, 0.1, 0.1,  // Node 4
     2.0,  0.0,  2.0, 1.0,    0.3, 0.1, 0.1,  // Node 7
     2.0,  0.0,  0.0, 1.0,    1.0, 0.1, 0.1,  // Node 3

    // +y face: GREEN
     0.0,  2.0,  0.0, 1.0,    0.5, 1.0, 0.0,  // Node 1
     0.0,  2.0,  2.0, 1.0,    0.2, 0.3, 0.0,  // Node 5
     2.0,  2.0,  2.0, 1.0,    0.3, 0.2, 0.0,  // Node 4

     2.0,  2.0,  2.0, 1.0,    0.3, 0.2, 0.1,  // Node 4
     2.0,  2.0,  0.0, 1.0,    0.2, 0.3, 0.1,  // Node 2 
     0.0,  2.0,  0.0, 1.0,    0.5, 1.0, 0.1,  // Node 1

    // +z face: BLUE
     0.0,  2.0,  2.0, 1.0,    0.9, 0.3, 1.0,  // Node 5
     0.0,  0.0,  2.0, 1.0,    0.5, 0.3, 1.0,  // Node 6
     2.0,  0.0,  2.0, 1.0,    0.9, 0.3, 1.0,  // Node 7

     2.0,  0.0,  2.0, 1.0,    0.9, 0.1, 1.0,  // Node 7
     2.0,  2.0,  2.0, 1.0,    0.5, 0.1, 1.0,  // Node 4
     0.0,  2.0,  2.0, 1.0,    0.9, 0.1, 1.0,  // Node 5

    // -x face: CYAN
     0.0,  0.0,  2.0, 1.0,    0.0, 1.0, 1.0,  // Node 6 
     0.0,  2.0,  2.0, 1.0,    0.0, 0.3, 1.0,  // Node 5 
     0.0,  2.0,  0.0, 1.0,    0.0, 1.0, 1.0,  // Node 1
    
     0.0,  2.0,  0.0, 1.0,    0.1, 1.0, 1.0,  // Node 1
     0.0,  0.0,  0.0, 1.0,    0.1, 0.3, 1.0,  // Node 0  
     0.0,  0.0,  2.0, 1.0,    0.1, 1.0, 1.0,  // Node 6  
    
    // -y face: MAGENTA
     2.0,  0.0,  0.0, 1.0,    1.0, 0.1, 1.0,  // Node 3
     2.0,  0.0,  2.0, 1.0,    0.8, 0.1, 0.9,  // Node 7
     0.0,  0.0,  2.0, 1.0,    0.5, 0.6, 0.3,  // Node 6

     0.0,  0.0,  2.0, 1.0,    1.0, 0.6, 1.0,  // Node 6
     0.0,  0.0,  0.0, 1.0,    0.8, 0.1, 1.0,  // Node 0
     2.0,  0.0,  0.0, 1.0,    0.5, 0.1, 1.0,  // Node 3

     // -z face: YELLOW
     2.0,  2.0,  0.0, 1.0,    1.0, 1.0, 0.0,  // Node 2
     2.0,  0.0,  0.0, 1.0,    0.5, 1.0, 0.0,  // Node 3
     0.0,  0.0,  0.0, 1.0,    1.0, 1.0, 0.0,  // Node 0   

     0.0,  0.0,  0.0, 1.0,    1.0, 1.0, 0.1,  // Node 0
     0.0,  2.0,  0.0, 1.0,    0.5, 1.0, 0.1,  // Node 1
     2.0,  2.0,  0.0, 1.0,    1.0, 1.0, 0.1,  // Node 2
 
  ]);
  // sphStart = 336;           // next, we'll store the sphere;
  // for(j=0; j< sphVerts.length; i++, j++) {// don't initialize i -- reuse it!
  //   colorShapes[i] = sphVerts[j];
  //   }
  // var u_Width = gl.getAttribLocation(gl.program, 'a_Position');
  // if(!u_Width){
  //   console.log('Failed to get the storage location of u_Width');
  //   return;
  // }

  // var u_Height = gl.getAttribLocation(gl.program, 'a_Position');
  // if(!u_Height){
  //   console.log('Failed to get the storage location of u_Height');
  //   return;
  // }

  // gl.uniform1f(u_Width, gl.drawingBufferWidth);
  // gl.uniform1f(u_Height, gl.drawingBufferHeight);

  var siz = box.length + sphVerts.length + box_tri.length;
  var colorShapes = new Float32Array(siz);
  recStart = 0;
  for(i=0,j=0; j< box.length; i++,j++) {
    colorShapes[i] = box[j];
    }
  sphStart = i;
  for(j=0; j< sphVerts.length; i++, j++) {// don't initialize i -- reuse it!
    colorShapes[i] = sphVerts[j];
    }
  triStart = i;
  for(j=0; j< box_tri.length; i++, j++) {// don't initialize i -- reuse it!
    colorShapes[i] = box_tri[j];
    }
  var nn = siz/7;    // 12 tetrahedron vertices; 36 cube verts (6 per side*6 sides)
  
  
  // Create a buffer object
  var shapeBufferHandle = gl.createBuffer();  
  if (!shapeBufferHandle) {
    console.log('Failed to create the shape buffer object');
    return false;
  }

  // Bind the the buffer object to target:
  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
  // Transfer data from Javascript array colorShapes to Graphics system VBO
  // (Use sparingly--may be slow if you transfer large shapes stored in files)
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

  var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?
    
  //Get graphics system's handle for our Vertex Shader's position-input variable: 
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  // canvas.onmousedown = function(ev){click(ev, gl, canvas, a_Position);};
  // Use handle to specify how to retrieve position data from our VBO:
  gl.vertexAttribPointer(
      a_Position,   // choose Vertex Shader attribute to fill with data
      4,            // how many values? 1,2,3 or 4.  (we're using x,y,z,w)
      gl.FLOAT,     // data type for each value: usually gl.FLOAT
      false,        // did we supply fixed-point data AND it needs normalizing?
      FSIZE * 7,    // Stride -- how many bytes used to store each vertex?
                    // (x,y,z,w, r,g,b) * bytes/value
      0);           // Offset -- now many bytes from START of buffer to the
                    // value we will actually use?
  gl.enableVertexAttribArray(a_Position);  
                    // Enable assignment of vertex buffer object's position data

  // Get graphics system's handle for our Vertex Shader's color-input variable;
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  // Use handle to specify how to retrieve color data from our VBO:
  gl.vertexAttribPointer(
    a_Color,        // choose Vertex Shader attribute to fill with data
    3,              // how many values? 1,2,3 or 4. (we're using R,G,B)
    gl.FLOAT,       // data type for each value: usually gl.FLOAT
    false,          // did we supply fixed-point data AND it needs normalizing?
    FSIZE * 7,      // Stride -- how many bytes used to store each vertex?
                    // (x,y,z,w, r,g,b) * bytes/value
    FSIZE * 4);     // Offset -- how many bytes from START of buffer to the
                    // value we will actually use?  Need to skip over x,y,z,w
                    
  gl.enableVertexAttribArray(a_Color);  
                    // Enable assignment of vertex buffer object's position data

  //--------------------------------DONE!
  // Unbind the buffer object 
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return nn;
}

function draw(gl, n, currentAngle, Angle_sphere,moon_angle, modelMatrix, u_ModelMatrix) {
//==============================================================================
  // Clear <canvas>  colors AND the depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //-------Draw Spinning sphere as sun
  // modelMatrix.setTranslate(0.4 + xNewPoint, 0 + ynewPoint, 0.0); 
  modelMatrix.setTranslate(0.4 + xNewPoint, 0 + yNewPoint, 0);
  // 'set' means DISCARD old matrix,
              // (drawing axes centered in CVV), and then make new
              // drawing axes moved to the lower-left corner of CVV.
  modelMatrix.scale(1,1,-1);              // convert to left-handed coord sys
                                          // to match WebGL display canvas.
 var dist = Math.sqrt(xMdragTot*xMdragTot + yMdragTot*yMdragTot);
              // why add 0.001? avoids divide-by-zero in next statement
              // in cases where user didn't drag the mouse.)
  modelMatrix.rotate(dist*120.0, -yMdragTot+0.0001, xMdragTot+0.0001, 0.0);
  modelMatrix.scale(0.2, 0.2, 0.2);
              // Make it smaller:
  // modelMatrix.rotate(currentAngle, 1, 1, 1);
  modelMatrix.rotate(Angle_sphere, 0, 1, 0);  // Spin on XY diagonal axis
  // modelMatrix.translate(2, 0, 0);

  // Drawing:   
  // Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                sphStart/floatsPerVertex, // start at this vertex number, and 
                sphVerts.length/floatsPerVertex); // draw this many vertices.
// // planet one
// pushMatrix(modelMatrix);
// pushMatrix(modelMatrix);
// modelMatrix.translate(0, 0, 0);  // 'set' means DISCARD old matrix,
//               // (drawing axes centered in CVV), and then make new
//               // drawing axes moved to the lower-left corner of CVV.
//   // modelMatrix.scale(1,1,-1);              // convert to left-handed coord sys
//                                           // to match WebGL display canvas.
//   // modelMatrix.scale(0.6, 0.3, 0.3);
//   //             // Make it smaller:
//   // modelMatrix.rotate(currentAngle, 1, 0, 0);  // Spin on XY diagonal axis
//   // modelMatrix.translate(-1, -1, -1);
//   // DRAW CUBE:   Use ths matrix to transform & draw
//   //            the second set of vertices stored in our VBO:
//   gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
//       // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
//   gl.drawArrays(gl.TRIANGLES, recStart/floatsPerVertex,36);
//   //thigh 
// // one of the legs in order to easily go back to draw another thigh push it first
// //push to stack first



//============================
//balls  BALL ONE
//============================
modelMatrix.scale(5, 5, 5);
modelMatrix.translate(0, 0, 0.0); // 'set' means DISCARD old matrix,
              // (drawing axes centered in CVV), and then make new
              // drawing axes moved to the lower-left corner of CVV.
  modelMatrix.scale(1,1,-1);              // convert to left-handed coord sys
                                          // to match WebGL display canvas.
  modelMatrix.scale(0.1, 0.1, 0.1);
              // Make it smaller:
  modelMatrix.rotate(Angle_sphere, 1, 0, 0);  // Spin on XY diagonal axis
  modelMatrix.translate(6,0,0);
  // modelMatrix.rotate(currentAngle, 1, 0, 1);
  // Drawing:   
  // Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                sphStart/floatsPerVertex, // start at this vertex number, and 
                sphVerts.length/floatsPerVertex); // draw this many vertices.

//BALL Two
////////
///////
// modelMatrix = popMatrix();
//     modelMatrix.scale(5, 5, 5);
// modelMatrix.translate(0, 0, 0.0); // 'set' means DISCARD old matrix,
//               // (drawing axes centered in CVV), and then make new
//               // drawing axes moved to the lower-left corner of CVV.
//   modelMatrix.scale(1,1,-1);              // convert to left-handed coord sys
//                                           // to match WebGL display canvas.
//   modelMatrix.scale(0.075, 0.075, 0.075);
//               // Make it smaller:
//   modelMatrix.rotate(Angle_sphere, 0, 1, 0);  // Spin on XY diagonal axis
//   modelMatrix.translate(0,5,0);
//   // modelMatrix.rotate(currentAngle, 1, 0, 1);
//   // Drawing:   
//   // Pass our current matrix to the vertex shaders:
//   gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
//       // Draw just the sphere's vertices
//   gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
//                 sphStart/floatsPerVertex, // start at this vertex number, and 
//                 sphVerts.length/floatsPerVertex); // draw this many vertices.
  modelMatrix.setTranslate(0.4 + xNewPoint, 0 + yNewPoint, 0);
  // 'set' means DISCARD old matrix,
              // (drawing axes centered in CVV), and then make new
              // drawing axes moved to the lower-left corner of CVV.
  modelMatrix.scale(1,1,-1);              // convert to left-handed coord sys
                                          // to match WebGL display canvas.
 var dist = Math.sqrt(xMdragTot*xMdragTot + yMdragTot*yMdragTot);
              // why add 0.001? avoids divide-by-zero in next statement
              // in cases where user didn't drag the mouse.)
  modelMatrix.rotate(dist*120.0, -yMdragTot+0.0001, xMdragTot+0.0001, 0.0);
  modelMatrix.scale(0.075, 0.075, 0.075);
              // Make it smaller:
  // modelMatrix.rotate(currentAngle, 1, 1, 1);
  modelMatrix.rotate(-Angle_sphere, 1, 0, 0);  // Spin on XY diagonal axis
  modelMatrix.translate(0, 5, 0);
  // modelMatrix.translate(2, 0, 0);

  // Drawing:   
  // Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                sphStart/floatsPerVertex, // start at this vertex number, and 
                sphVerts.length/floatsPerVertex); // draw this many vertices.

//==============================
//
//BALL THREE
//==============================

// modelMatrix = popMatrix();
//     modelMatrix.scale(5, 5, 5);
// modelMatrix.translate(0, 0, 0.0); // 'set' means DISCARD old matrix,
//               // (drawing axes centered in CVV), and then make new
//               // drawing axes moved to the lower-left corner of CVV.
//   modelMatrix.scale(1,1,-1);              // convert to left-handed coord sys
//                                           // to match WebGL display canvas.
//   modelMatrix.scale(0.05, 0.05, 0.05);
//               // Make it smaller:
//   modelMatrix.rotate(Angle_sphere, 0, 0, 1);  // Spin on XY diagonal axis
//   modelMatrix.translate(5.5,0,0);
//   // modelMatrix.rotate(currentAngle, 1, 0, 1);
//   // Drawing:   
//   // Pass our current matrix to the vertex shaders:
//   gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
//       // Draw just the sphere's vertices
//   gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
//                 sphStart/floatsPerVertex, // start at this vertex number, and 
//                 sphVerts.length/floatsPerVertex); // draw this many vertices.
  modelMatrix.setTranslate(0.4 + xNewPoint, 0 + yNewPoint, 0);
  // 'set' means DISCARD old matrix,
              // (drawing axes centered in CVV), and then make new
              // drawing axes moved to the lower-left corner of CVV.
  modelMatrix.scale(1,1,-1);              // convert to left-handed coord sys
                                          // to match WebGL display canvas.
 var dist = Math.sqrt(xMdragTot*xMdragTot + yMdragTot*yMdragTot);
              // why add 0.001? avoids divide-by-zero in next statement
              // in cases where user didn't drag the mouse.)
  modelMatrix.rotate(dist*120.0, -yMdragTot+0.0001, xMdragTot+0.0001, 0.0);
  modelMatrix.scale(0.05, 0.05, 0.05);
              // Make it smaller:
  // modelMatrix.rotate(currentAngle, 1, 1, 1);
  modelMatrix.rotate(Angle_sphere, 1, 1, 0);  // Spin on XY diagonal axis
  modelMatrix.translate(0, 0, 6);
  // modelMatrix.translate(2, 0, 0);

  // Drawing:   
  // Pass our current matrix to the vertex shaders:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the sphere's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
                sphStart/floatsPerVertex, // start at this vertex number, and 
                sphVerts.length/floatsPerVertex); // draw this many vertices.


    //====================================
    //=========strip to support sphere======
    //====================================

    //
    //      BALL ONE
    //
  modelMatrix.setTranslate(0.4 + xNewPoint, 0 + yNewPoint, 0);  // 'set' means DISCARD old matrix,
              // (drawing axes centered in CVV), and then make new
              // drawing axes moved to the lower-left corner of CVV.
  modelMatrix.scale(1,1,-1); 
  // modelMatrix.rotate(15, 0, 0, 1);
  // modelMatrix.rotate(15, 0, 1, 0);
  // modelMatrix.rotate(-15, 1, 0, 0);
  var dist = Math.sqrt(xMdragTot*xMdragTot + yMdragTot*yMdragTot);
  //             // why add 0.001? avoids divide-by-zero in next statement
  //             // in cases where user didn't drag the mouse.)
  modelMatrix.rotate(dist*120.0, -yMdragTot+0.0001, xMdragTot+0.0001, 0.0);
  // modelMatrix.
               // convert to left-handed coord sys
                                          // to match WebGL display canvas.
  // modelMatrix.scale(0.3, 0.05, 0.05);
  modelMatrix.rotate(Angle_sphere, 0, 1, 0);
  modelMatrix.scale(0.3, 0.015, 0.015);
  modelMatrix.translate(0.8, 0 ,0);
  // modelMatrix.rotate(Angle_sphere, 0, 0, 0);
              // Make it smaller:
  modelMatrix.rotate(0, 0, 0, 1);  // Spin on XY diagonal axis
  modelMatrix.translate(-1, -1, -1);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
  gl.drawArrays(gl.TRIANGLES, recStart,36);


    //=======================================
    //
    //strip for ball two
    //
    //=======================================
  modelMatrix.setTranslate(0.4 + xNewPoint, 0 + yNewPoint, 0);  // 'set' means DISCARD old matrix,
              // (drawing axes centered in CVV), and then make new
              // drawing axes moved to the lower-left corner of CVV.
  modelMatrix.scale(1,1,-1); 
  // modelMatrix.rotate(15, 0, 0, 1);
  // modelMatrix.rotate(15, 0, 1, 0);
  // modelMatrix.rotate(-15, 1, 0, 0);
  var dist = Math.sqrt(xMdragTot*xMdragTot + yMdragTot*yMdragTot);
  //             // why add 0.001? avoids divide-by-zero in next statement
  //             // in cases where user didn't drag the mouse.)
  modelMatrix.rotate(dist*120.0, -yMdragTot+0.0001, xMdragTot+0.0001, 0.0);
  // modelMatrix.
               // convert to left-handed coord sys
                                          // to match WebGL display canvas.
  // modelMatrix.scale(0.3, 0.05, 0.05);
  modelMatrix.rotate(Angle_sphere - 90, -1, 0, 0);
  modelMatrix.scale(0.01125, 0.01125, 0.2);
  modelMatrix.translate(0, 0 ,-0.6);
  // modelMatrix.rotate(Angle_sphere, 0, 0, 0);
              // Make it smaller:
  modelMatrix.rotate(0, 0, 0, 1);  // Spin on XY diagonal axis
  modelMatrix.translate(-1, -1, -1); 
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
  gl.drawArrays(gl.TRIANGLES, recStart,36);


  //===================================
  //
  //
  //strip for ball three
  //
  //===================================
  modelMatrix.setTranslate(0.4 + xNewPoint, 0 + yNewPoint, 0);  // 'set' means DISCARD old matrix,
              // (drawing axes centered in CVV), and then make new
              // drawing axes moved to the lower-left corner of CVV.
  modelMatrix.scale(1,1,-1); 
  // modelMatrix.rotate(15, 0, 0, 1);
  // modelMatrix.rotate(15, 0, 1, 0);
  // modelMatrix.rotate(-15, 1, 0, 0);
  var dist = Math.sqrt(xMdragTot*xMdragTot + yMdragTot*yMdragTot);
  //             // why add 0.001? avoids divide-by-zero in next statement
  //             // in cases where user didn't drag the mouse.)
  modelMatrix.rotate(dist*120.0, -yMdragTot+0.0001, xMdragTot+0.0001, 0.0);
  // modelMatrix.
               // convert to left-handed coord sys
                                          // to match WebGL display canvas.
  // modelMatrix.scale(0.3, 0.05, 0.05);
  // modelMatrix.rotate()
  modelMatrix.rotate(Angle_sphere, 1, 1, 0);
  modelMatrix.scale(0.0075, 0.0075, 0.15);
  // modelMatrix.scale(0.01125, 0.01125, 0.2);
  modelMatrix.translate(0, 0, 0.6);
  // modelMatrix.rotate(Angle_sphere, 0, 0, 0);
              // Make it smaller:
  modelMatrix.rotate(-Angle_sphere, 0, 0, 1);  // Spin on XY diagonal axis
  modelMatrix.translate(-1, -1, -1); 
//------------------------
//-------mouse interaction
//----------------------
  // var dist = Math.sqrt(xMdragTot*xMdragTot + yMdragTot*yMdragTot);
              // why add 0.001? avoids divide-by-zero in next statement
              // in cases where user didn't drag the mouse.)
  // modelMatrix.rotate(dist*120.0, -yMdragTot+0.0001, xMdragTot+0.0001, 0.0);
  // DRAW CUBE:   Use ths matrix to transform & draw
  //            the second set of vertices stored in our VBO:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
  gl.drawArrays(gl.TRIANGLES, recStart,36);
  // modelMatrix.
               // convert to left-handed coord sys


      //-------Draw Spinning sphere as sun
 // modelMatrix.setTranslate(0.4, 0.4, 0.0); // 'set' means DISCARD old matrix,
 //              // (drawing axes centered in CVV), and then make new
 //              // drawing axes moved to the lower-left corner of CVV.
 //  modelMatrix.scale(1,1,-1);              // convert to left-handed coord sys
 //                                          // to match WebGL display canvas.
 // var dist = Math.sqrt(xMdragTot*xMdragTot + yMdragTot*yMdragTot);
 //              // why add 0.001? avoids divide-by-zero in next statement
 //              // in cases where user didn't drag the mouse.)
 //  modelMatrix.rotate(dist*120.0, -yMdragTot+0.0001, xMdragTot+0.0001, 0.0);
 //  modelMatrix.scale(0.25, 0.25, 0.25);
 //              // Make it smaller:
 //  // modelMatrix.rotate(currentAngle, 1, 1, 1);
 //  modelMatrix.rotate(Angle_sphere, 0, 1, 0);  // Spin on XY diagonal axis
 //  // modelMatrix.translate(2, 0, 0);

 //  // Drawing:   
 //  // Pass our current matrix to the vertex shaders:
 //  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
 //      // Draw just the sphere's vertices
 //  gl.drawArrays(gl.TRIANGLE_STRIP,        // use this drawing primitive, and
 //                triStart/floatsPerVertex, // start at this vertex number, and 
 //                box_tri.length/floatsPerVertex); // draw this many vertices.



//============================================
  // NEXT, create different drawing axes, and...
  modelMatrix.setTranslate(-0.5, 0.5, 0);  // 'set' means DISCARD old matrix,
              // (drawing axes centered in CVV), and then make new
              // drawing axes moved to the lower-left corner of CVV.
  modelMatrix.scale(1,1,-1); 
  modelMatrix.rotate(15, 0, 0, 1);
  modelMatrix.rotate(15, 0, 1, 0);
  modelMatrix.rotate(-15, 1, 0, 0);
  var dist = Math.sqrt(xMdragTot*xMdragTot + yMdragTot*yMdragTot);
  //             // why add 0.001? avoids divide-by-zero in next statement
  //             // in cases where user didn't drag the mouse.)
  modelMatrix.rotate(dist*120.0, -yMdragTot+0.0001, xMdragTot+0.0001, 0.0);
  // modelMatrix.
               // convert to left-handed coord sys
                                          // to match WebGL display canvas.
  modelMatrix.scale(0.2, 0.2, 0.2);
              // Make it smaller:
  modelMatrix.rotate(0, 0, 0, 1);  // Spin on XY diagonal axis
  modelMatrix.translate(-1, -1, -1);
//------------------------
//-------mouse interaction
//----------------------
  // var dist = Math.sqrt(xMdragTot*xMdragTot + yMdragTot*yMdragTot);
              // why add 0.001? avoids divide-by-zero in next statement
              // in cases where user didn't drag the mouse.)
  // modelMatrix.rotate(dist*120.0, -yMdragTot+0.0001, xMdragTot+0.0001, 0.0);
  // DRAW CUBE:   Use ths matrix to transform & draw
  //            the second set of vertices stored in our VBO:
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
  gl.drawArrays(gl.TRIANGLES, recStart,36);
// body two
  modelMatrix.translate(0, -2, 0);  // 'set' means DISCARD old matrix,
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
  gl.drawArrays(gl.TRIANGLES, recStart/floatsPerVertex,36);
  //thigh 
// one of the legs in order to easily go back to draw another thigh push it first
//push to stack first
  pushMatrix(modelMatrix);
  /////////
  modelMatrix.translate(0.5, 0, 1);
  modelMatrix.rotate(180, 1, 0, 0);
  modelMatrix.rotate(currentAngle*0.15+20, 1, 0, 0);
  modelMatrix.scale(0.2, 1, 0.2);
  // modelMatrix.translate(-1, 0, -1);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
      // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
  gl.drawArrays(gl.TRIANGLES, recStart/floatsPerVertex,36);
//draw the first calf
//the 
//first
///calf
  modelMatrix.scale(5, 1, 5);
  modelMatrix.translate(0, 2, 0);
  // modelMatrix.rotate(180, 1, 0, 0);
  // modelMatrix.scale(0.5, 1, 0.5);
  modelMatrix.rotate(currentAngle*0.2, 1, 0, 0);
  // modelMatrix.translate(0.5, 0, 0.5);
  modelMatrix.scale(0.1, 1, 0.1);
  modelMatrix.translate(1, 0, 1);
  // modelMatrix.rotate(currentAngle*0.2+10, 1, 0, 0);
  // modelMatrix.scale(0.5, 1, 0.5);
  // // modelMatrix.translate(-1, 0, -1);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  //     // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
  gl.drawArrays(gl.TRIANGLES, recStart/floatsPerVertex,36);

  // draw
  // a
  // foot
  modelMatrix.scale(10, 1, 10);
  modelMatrix.translate(0, 2, 0);
  // modelMatrix.rotate(180, 1, 0, 0);
  // modelMatrix.scale(0.5, 1, 0.5);
  modelMatrix.rotate(10, 0, 1, 0);
  // modelMatrix.rotate(currentAngle*0.1, 1, 0, 0);
  // modelMatrix.translate(0.5, 0, 0.5);
  modelMatrix.scale(0.1, 0.1, 0.3);
  modelMatrix.translate(0.1, 0, 0.1);
  // modelMatrix.rotate(currentAngle*0.2+10, 1, 0, 0);
  // modelMatrix.scale(0.5, 1, 0.5);
  // // modelMatrix.translate(-1, 0, -1);
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  //     // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
  gl.drawArrays(gl.TRIANGLES, recStart/floatsPerVertex,36);

//draw 
//another
//leg
modelMatrix = popMatrix();
//another thigh
modelMatrix.translate(1.5, 0, 1);
modelMatrix.rotate(180, 1, 0, 0);
modelMatrix.rotate(-currentAngle*0.15+20, 1, 0, 0);
modelMatrix.scale(0.2, 1, 0.2);
// modelMatrix.translate(-1, 0, -1);
gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
gl.drawArrays(gl.TRIANGLES, recStart/floatsPerVertex,36);
//
//another 
//calf
modelMatrix.scale(5, 1, 5);
modelMatrix.translate(0, 2, 0);
// modelMatrix.rotate(180, 1, 0, 0);
// modelMatrix.scale(0.5, 1, 0.5);
modelMatrix.rotate(-currentAngle*0.2, 1, 0, 0);
// modelMatrix.translate(0.5, 0, 0.5);
modelMatrix.scale(0.1, 1, 0.1);
modelMatrix.translate(1, 0, 1);
// modelMatrix.rotate(currentAngle*0.2+10, 1, 0, 0);
// modelMatrix.scale(0.5, 1, 0.5);
// // modelMatrix.translate(-1, 0, -1);
gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
//     // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
gl.drawArrays(gl.TRIANGLES, recStart/floatsPerVertex,36);

//another
//foot
// modelMatrix = popMatrix();

modelMatrix.scale(10, 1, 10);
modelMatrix.translate(0, 2, 0);
// modelMatrix.rotate(180, 1, 0, 0);
// modelMatrix.scale(0.5, 1, 0.5);
modelMatrix.rotate(10, 0, 1, 0);
// modelMatrix.rotate(currentAngle*0.1, 1, 0, 0);
// modelMatrix.translate(0.5, 0, 0.5);
modelMatrix.scale(0.1, 0.1, 0.3);
modelMatrix.translate(0.1, 0, 0.1);
// modelMatrix.rotate(currentAngle*0.2+10, 1, 0, 0);
// modelMatrix.scale(0.5, 1, 0.5);
// // modelMatrix.translate(-1, 0, -1);
gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
//     // Draw just the first set of vertices: start at vertex SHAPE_0_SIZE
gl.drawArrays(gl.TRIANGLES, recStart/floatsPerVertex,36);
  
  
}

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();
var g_last_sphere = Date.now();

function animate(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
 if(angle >  120.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
 if(angle < -120.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}

function animate_for_sphere(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last_sphere;
  g_last_sphere = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
 // if(angle >  120.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
 // if(angle < -120.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  
  var newAngle = angle + (ANGLE_STEP1 * elapsed) / 1000.0;
  return newAngle %= 360;
}
function animate_for_moon(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last_sphere;
  g_last_sphere = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
 // if(angle >  120.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
 // if(angle < -120.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  
  var newAngle = angle + (ANGLE_STEP2 * elapsed) / 1000.0;
  return newAngle %= 360;
}
//==================HTML Button Callbacks
function spinUp() {
  ANGLE_STEP += 25; 
  ANGLE_STEP1 += 25;

}

function spinDown() {
 ANGLE_STEP -= 25;
 ANGLE_STEP1 -= 25; 
}

function runStop() {
  if(ANGLE_STEP*ANGLE_STEP > 1) {
    myTmp = ANGLE_STEP;
    ANGLE_STEP = 0;
  }
  else {
    ANGLE_STEP = myTmp;
  }
  if(ANGLE_STEP1*ANGLE_STEP1 > 1) {
    myTmp1 = ANGLE_STEP1;
    ANGLE_STEP1 = 0;
  }
  else {
    ANGLE_STEP1 = myTmp1;
  }
}
function clearDrag() {
// Called when user presses 'Clear' button in our webpage
  xMdragTot = 0.0;
  yMdragTot = 0.0;
}
function myMouseDown(ev, gl, canvas) {
//==============================================================================
// Called when user PRESSES down any mouse button;
//                  (Which button?    console.log('ev.button='+ev.button);   )
//    ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//    pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
//  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
  
  // Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
               (canvas.width/2);      // normalize canvas to -1 <= x < +1,
  var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
               (canvas.height/2);
//  console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
  
  isclick = true;                      // set our mouse-dragging flag
  // isDrag = true;
  xMclik = x;                         // record where mouse-dragging began
  yMclik = y;
};


function myMouseMove(ev, gl, canvas) {
//==============================================================================
// Called when user MOVES the mouse with a button already pressed down.
//                  (Which button?   console.log('ev.button='+ev.button);    )
//    ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//    pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
  // if(isDrag == false) return;
  // isclick=false;      // IGNORE all mouse-moves except 'dragging'
  if(isclick == false) return;
  isDrag = true;

  // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
  
  // Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
               (canvas.width/2);      // normalize canvas to -1 <= x < +1,
  var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
               (canvas.height/2);
//  console.log('myMouseMove(CVV coords  ):  x, y=\t',x,',\t',y);

    

  // find how far we dragged the mouse:
  // if(xMdragTot == 0 && yMdragTot == 0){
    
  // }else{
    xMdragTot += (x - xMclik);          // Accumulate change-in-mouse-position,&
    yMdragTot += (y - yMclik);
    xMclik = x;                         // Make next drag-measurement from here.
    yMclik = y;
  // }
  
  
};

function myMouseUp(ev, gl, canvas) {
//==============================================================================
// Called when user RELEASES mouse button pressed previously.
//                  (Which button?   console.log('ev.button='+ev.button);    )
//    ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//    pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
  isclick = false;
// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
//  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);
  
  // Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
               (canvas.width/2);      // normalize canvas to -1 <= x < +1,
  var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
               (canvas.height/2);
  console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);
  
  // isDrag = false;                     // CLEAR our mouse-dragging flag, and
  // accumulate any final bit of mouse-dragging we did:
  
  if(isDrag){

  xMdragTot += (x - xMclik);
  yMdragTot += (y - yMclik);
  isDrag = false;
  console.log('myMouseUp: xMdragTot,yMdragTot =',xMdragTot,',\t',yMdragTot);
  }
  else{
    xNewPoint = x - 0.4;
    yNewPoint = y;
  }
  

  // if(isclick){
  //   xNewPoint = x - 0.4;                // new center of planetery system
  //   yNewPoint = y;
  // }
};



function myKeyDown(ev) {
//===============================================================================
// Called when user presses down ANY key on the keyboard, and captures the 
// keyboard's scancode or keycode(varies for different countries and alphabets).
//  CAUTION: You may wish to avoid 'keydown' and 'keyup' events: if you DON'T 
// need to sense non-ASCII keys (arrow keys, function keys, pgUp, pgDn, Ins, 
// Del, etc), then just use the 'keypress' event instead.
//   The 'keypress' event captures the combined effects of alphanumeric keys and // the SHIFT, ALT, and CTRL modifiers.  It translates pressed keys into ordinary
// ASCII codes; you'll get the ASCII code for uppercase 'S' if you hold shift 
// and press the 's' key.
// For a light, easy explanation of keyboard events in JavaScript,
// see:    http://www.kirupa.com/html5/keyboard_events_in_javascript.htm
// For a thorough explanation of the messy way JavaScript handles keyboard events
// see:    http://javascript.info/tutorial/keyboard-events
//

  switch(ev.keyCode) {      // keycodes !=ASCII, but are very consistent for 
  //  nearly all non-alphanumeric keys for nearly all keyboards in all countries.
    case 32:
      runStop();
      console.log('press Space');
      break;
    case 37:    // left-arrow key
      // print in console:
      console.log(' left-arrow.');
      // and print on webpage in the <div> element with id='Result':
      document.getElementById('Result').innerHTML =
        ' Left Arrow:keyCode='+ev.keyCode;
      break;
    case 38:    // up-arrow key
      console.log('   up-arrow.');
      document.getElementById('Result').innerHTML =
        '   Up Arrow:keyCode='+ev.keyCode;
      break;
    case 39:    // right-arrow key
      console.log('right-arrow.');
      document.getElementById('Result').innerHTML =
        'Right Arrow:keyCode='+ev.keyCode;
      break;
    case 40:    // down-arrow key
      console.log(' down-arrow.');
      document.getElementById('Result').innerHTML =
        ' Down Arrow:keyCode='+ev.keyCode;
      break;
    default:
      console.log('myKeyDown()--keycode=', ev.keyCode, ', charCode=', ev.charCode);
      document.getElementById('Result').innerHTML =
        'myKeyDown()--keyCode='+ev.keyCode;
      break;
  }
}

function myKeyUp(ev) {
//===============================================================================
// Called when user releases ANY key on the keyboard; captures scancodes well

  console.log('myKeyUp()--keyCode='+ev.keyCode+' released.');
}

function myKeyPress(ev) {
//===============================================================================
// Best for capturing alphanumeric keys and key-combinations such as 
// CTRL-C, alt-F, SHIFT-4, etc.
  console.log('myKeyPress():keyCode='+ev.keyCode  +', charCode=' +ev.charCode+
                        ', shift='    +ev.shiftKey + ', ctrl='    +ev.ctrlKey +
                        ', altKey='   +ev.altKey   +
                        ', metaKey(Command key or Windows key)='+ev.metaKey);
}
function makeSphere() {
//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like 
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z), 
// and connect them as a 'stepped spiral' design (see makeCylinder) to build the
// sphere from one triangle strip.
  var slices = 13;    // # of slices of the sphere along the z axis. >=3 req'd
                      // (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts  = 27; // # of vertices around the top edge of the slice
                      // (same number of vertices on bottom of slice, too)
  var topColr = new Float32Array([0.7, 0.7, 0.7]);  // North Pole: light gray
  var equColr = new Float32Array([0.3, 0.7, 0.3]);  // Equator:    bright green
  var botColr = new Float32Array([0.9, 0.9, 0.9]);  // South Pole: brightest gray.
  var sliceAngle = Math.PI/slices;  // lattitude angle spanned by one slice.

  // Create a (global) array to hold this sphere's vertices:
  sphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
                    // # of vertices * # of elements needed to store them. 
                    // each slice requires 2*sliceVerts vertices except 1st and
                    // last ones, which require only 2*sliceVerts-1.
                    
  // Create dome-shaped top slice of sphere at z=+1
  // s counts slices; v counts vertices; 
  // j counts array elements (vertices * elements per vertex)
  var cos0 = 0.0;         // sines,cosines of slice's top, bottom edge.
  var sin0 = 0.0;
  var cos1 = 0.0;
  var sin1 = 0.0; 
  var j = 0;              // initialize our array index
  var isLast = 0;
  var isFirst = 1;
  for(s=0; s<slices; s++) { // for each slice of the sphere,
    // find sines & cosines for top and bottom of this slice
    if(s==0) {
      isFirst = 1;  // skip 1st vertex of 1st slice.
      cos0 = 1.0;   // initialize: start at north pole.
      sin0 = 0.0;
    }
    else {          // otherwise, new top edge == old bottom edge
      isFirst = 0;  
      cos0 = cos1;
      sin0 = sin1;
    }               // & compute sine,cosine for new bottom edge.
    cos1 = Math.cos((s+1)*sliceAngle);
    sin1 = Math.sin((s+1)*sliceAngle);
    // go around the entire slice, generating TRIANGLE_STRIP verts
    // (Note we don't initialize j; grows with each new attrib,vertex, and slice)
    if(s==slices-1) isLast=1; // skip last vertex of last slice.
    for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) { 
      if(v%2==0)
      {       // put even# vertices at the the slice's top edge
              // (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
              // and thus we can simplify cos(2*PI(v/2*sliceVerts))  
        sphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);  
        sphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);  
        sphVerts[j+2] = cos0;   
        sphVerts[j+3] = 1.0;      
      }
      else {  // put odd# vertices around the slice's lower edge;
              // x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
              //          theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
        sphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);    // x
        sphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);    // y
        sphVerts[j+2] = cos1;                                       // z
        sphVerts[j+3] = 1.0;                                        // w.   
      }
      if(s==0) {  // finally, set some interesting colors for vertices:
        sphVerts[j+4]= 
        [0]; 
        sphVerts[j+5]=topColr[1]; 
        sphVerts[j+6]=topColr[2]; 
        }
      else if(s==slices-1) {
        sphVerts[j+4]=botColr[0]; 
        sphVerts[j+5]=botColr[1]; 
        sphVerts[j+6]=botColr[2]; 
      }
      else {
          sphVerts[j+4]=Math.random();// equColr[0]; 
          sphVerts[j+5]=Math.random();// equColr[1]; 
          sphVerts[j+6]=Math.random();// equColr[2];          
      }
    }
  }
}
