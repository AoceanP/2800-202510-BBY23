/* So I really wanted to create the snake game in our 404 page using javascript, I did alot of research through youtube, stack overflow, wc schools for html5 canvas in which i had to learn
to implement this game. The link I provided is what I used for w3 schools. Learning canvas and using my existing knowledge in javascript, 
assisted me in creating this game.
below is listed a few links i used to teach me the game snake:
https://www.youtube.com/watch?v=uyhzCBEGaBY&ab_channel=freeCodeCamp.org
https://www.youtube.com/watch?app=desktop&v=baBq5GAL0_U&t=0s&ab_channel=KennyYipCoding
https://www.w3schools.com/html/html5_canvas.asp
https://www.youtube.com/watch?app=desktop&v=05kCgeIIjkY&ab_channel=HowtoBecomeaDeveloper
https://stackoverflow.com/questions/19614329/snake-game-in-javascript
https://stackoverflow.com/questions/65727618/addeventlistener-javascript-snake-game-move-without-input

I learned alot from creating this game, I learned how to use the canvas element in html5, how to create a grid using the canvas element,
and I think it's a fun way to have a 404 screen. This was a challenge for me, but I think I did a good job.

@author Aleksandar
*/
window.addEventListener("DOMContentLoaded", () => {

  const canvas = document.getElementById("game");

  const ctx = canvas.getContext("2d");

  const startBtn = document.getElementById("startBtn");

  const gameOverCard = document.getElementById("gameOverCard");

  const BLOCK_SIZE = 30;
  const GAME_SIZE = 25;
  const FPS = 8;

  let snake = [];
  let food = {};
  //direction x axis
  let dx = 1;
  //direction y axis
  let dy = 0;
  let gameLoop = null;

  function drawBlock(x, y, color) {

    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

  }

  function clearCanvas() {

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

  }

  function drawGrid() {

    ctx.strokeStyle = "#dddddd";

    for (let i = 0; i <= canvas.width; i += BLOCK_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }

    for (let j = 0; j <= canvas.height; j += BLOCK_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }
  }

  function placeFood() {
    food = {
      x: Math.floor(Math.random() * GAME_SIZE),
      y: Math.floor(Math.random() * GAME_SIZE)
    };
  }

  function draw() {
    clearCanvas();
    drawGrid();
    drawBlock(food.x, food.y, "#ff3333");
    for (let i = 1; i < snake.length; i++) {
      drawBlock(snake[i].x, snake[i].y, "#00cc00");
    }
    drawBlock(snake[0].x, snake[0].y, "#016901");
  }

 function moveSnake() {

  const moves = [{ dx, dy }];

  for (let i = 0; i < moves.length; i++) {
    const head = {
      x: snake[0].x + moves[i].dx,
      y: snake[0].y + moves[i].dy
    };

    if (
      head.x < 0 || head.x >= GAME_SIZE ||
      head.y < 0 || head.y >= GAME_SIZE
    ) {
      endGame();
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      placeFood();
    } else {
      snake.pop();
    }
  }
}


  function gameStep() {
    moveSnake();
    draw();
  }

  function resetGame() {
    snake = [
      { x: 5, y: 5 }
    ];
    
    dx = 1;
    dy = 0;
    placeFood();
    draw();
  }

  function endGame() {

    clearInterval(gameLoop);

    gameOverCard.classList.remove("hidden");
  }

document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
      if (dy === 0) {
        dx = 0;
        dy = -1;
      }
      break;
    case "ArrowDown":
      if (dy === 0) {
        dx = 0;
        dy = 1;
      }
      break;
    case "ArrowLeft":
      if (dx === 0) {
        dx = -1;
        dy = 0;
      }
      break;
    case "ArrowRight":
      if (dx === 0) {
        dx = 1;
        dy = 0;
      }
      break;
  }
});

  startBtn.addEventListener("click", () => {

    if (gameLoop) clearInterval(gameLoop);

    gameOverCard.classList.add("hidden");

    resetGame();
    
    gameLoop = setInterval(gameStep, 1000 / FPS);
  });
});