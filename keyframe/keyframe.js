// canvas objektum amire kirajzoljuk a téglalapot
const canvas = document.getElementById("animation");
const ctx = canvas.getContext("2d");

function Resized()
{
    canvas.width = (document.documentElement.clientWidth * 0.7 | 0) - 40;
    canvas.height = document.documentElement.clientHeight - 25;
    
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

window.addEventListener("load", function()
{
    Resized();
});
window.addEventListener("resize", Resized);

// a és b közötti lineáris interpoláció
function Lerp(a, b, percent)
{
    return a + (b - a) * percent;
}

// melyik kulcskockánál járunk
let currentAnimationIndex = 0;

// hányadik képkockánál járunk
let currentFrame = 0;

// a kirajzolt téglalap mérete (hány százaléka a canvas magasságának)
const rectangleWidth = 20, rectangleHeight = 10;

// ez a függvény hívódik meg minden egyes képkocka kirajzolásánál
function Animate()
{
    if (!running)
        return;

    let currentFrameData = frameData[currentAnimationIndex];
    let nextFrameData = frameData[currentAnimationIndex + 1];

    // ha elértük az utolsó képkockát a jelenlegi kulcskockában
    if (nextFrameData.frame === currentFrame)
    {
        currentFrameData = nextFrameData;
        ++currentAnimationIndex;

        if (currentAnimationIndex === frameData.length - 1) // véget ért az animáció
        {
            document.getElementById("start-button").innerHTML = "Start";
            running = false;
            return;
        }

        nextFrameData = frameData[currentAnimationIndex + 1];
    }

    // hány képkockára vannak egymástól a kulcskockák
    let frameDistance = nextFrameData.frame - currentFrameData.frame;

    // hány százalékánál járunk a jelenlegi kulcskockának
    let percent = (currentFrame - currentFrameData.frame) / frameDistance;

    // interpolált értékek
    let currentPosX = Lerp(currentFrameData.posX, nextFrameData.posX, percent) / 100 * canvas.width;
    let currentPosY = Lerp(currentFrameData.posY, nextFrameData.posY, percent) / 100 * canvas.height;
    let currentRotation = Lerp(currentFrameData.rotation, nextFrameData.rotation, percent) / 180 * Math.PI;
    let currentScale = Lerp(currentFrameData.scale, nextFrameData.scale, percent);
    
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // kirajzolás
    let width = rectangleWidth / 100 * canvas.height, height = rectangleHeight / 100 * canvas.height;
    ctx.fillStyle = "#00ffff";
    ctx.save();
    let offsetX = currentPosX + width * 0.5 * currentScale, offsetY = currentPosY + height * 0.5 * currentScale;
    ctx.translate(offsetX, offsetY);
    ctx.rotate(currentRotation);
    ctx.translate(-offsetX, -offsetY);
    ctx.fillRect(currentPosX, currentPosY, width * currentScale, height * currentScale);
    ctx.restore();

    window.requestAnimationFrame(Animate);
    ++currentFrame;
}

// ez a segédváltozó tárolja azt, hogy éppen fut-e az animáció
let running = false;

// ez az objektum tárolja az egyes kulcskockák adatait
let frameData;

// ez a függvény indítja el az animációt
function Start()
{
    running = !running;
    if (!running)
    {
        document.getElementById("start-button").innerHTML = "Start";
        return;
    }

    let lines = document.getElementById("input").value.split("\n");
    
    frameData = [];

    let lastFrameTime = -1;
    for (let i = 0; i < lines.length; ++i)
    {
        if (lines[i].trim() === "")
            continue;

        let values = lines[i].match(/(\S+)/g);

        let error = false;
        if (values.length !== 5)
            error = true;
        else
        {
            let frame = Number(values[0]);
            let posX = Number(values[1]);
            let posY = Number(values[2]);
            let rotation = Number(values[3]);
            let scale = Number(values[4]);

            error = isNaN(frame) || isNaN(posX) || isNaN(posY) || isNaN(rotation) || isNaN(scale) || frame <= lastFrameTime;

            if (!error)
            {
                // a kulcskocka helyes, hozzáadjuk a listához
                lastFrameTime = frame;
                let currentFrameData =
                {
                    "frame": frame,
                    "posX": posX,
                    "posY": posY,
                    "rotation": rotation,
                    "scale": scale
                };

                frameData.push(currentFrameData);
            }
        }

        // hiba esetén jelezzük
        if (error)
        {
            running = false;
            alert("A(z) " + (i + 1) + ". sor hibás");
            return;
        }
    }

    document.getElementById("start-button").innerHTML = "Stop";
    
    currentFrame = 0;
    currentAnimationIndex = 0;
    Animate();
}