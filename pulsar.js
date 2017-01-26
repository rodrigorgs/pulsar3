// Mechanics:
// - Pick up the squares/targets and avoid the bullets!
//   - TODO: when captured the target explodes, destroying nearby objects
// - Arrows to move
// - Spacebar to slow down
//
// Dynamics
// - TODO: Ride the bullet to become closer of the targets
// - When the player is caught, she can deattach by moving away from the bullet

FIRST_LEVEL = 1;

TILESIZE = 21;

FRAMES = {
  PLAYER: 171,
  TOWER: 235,
  GOAL: 311
};

started = false;

Scene = {};

Scene.Win = function () {
};
Scene.Win.prototype = {
  init: function (params) {
    this.params = params;
  },

  create: function () {
    var text = game.add.text(0.5, 0.5, 'You won!', { fill: '#ffffff', fontSize: '20pt' });
    text.anchor.x = 0.5;
    text.anchor.y = 0.5;
    text.x = game.canvas.width / 2;
    text.y = game.canvas.height / 2;
  },
};

Scene.Game = function () {
};
Scene.Game.prototype = {
  init: function (params) {
    this.params = params;
  },

  nextLevel: function () {
    game.state.start('game', true, false, {level: this.params.level + 1});
  },

  restartLevel: function () {
    game.state.start('game', true, false, {level: this.params.level});
  },

  preload: function () {
    if (!started) {
      game.load.audio('music', 'assets/music.mp3');
      game.scale.setupScale(800, 600);
      game.scale.refresh();
    }
    game.load.audio('explosion', 'assets/explosion.wav');
    game.load.audio('goal', 'assets/powerup12.wav');
    game.load.audio('pickup', 'assets/pickup.wav');
    game.load.audio('hit', 'assets/hit.wav');

    game.load.tilemap('fase' + this.params.level, 'assets/fase' + this.params.level + '.json', null, Phaser.Tilemap.TILED_JSON);
    game.load.spritesheet('spritesheet', 'assets/spritesheet.png', TILESIZE, TILESIZE, -1, 2, 2);

    game.load.image('player', 'assets/player.png');
    game.load.image('tower', 'assets/tower.png');
    game.load.image('bullet', 'assets/bullet.png');
    
    game.load.image('tower4.png', 'assets/tower4.png');
    game.load.image('tower5.png', 'assets/tower5.png');
    game.load.image('tower6.png', 'assets/tower6.png');
    game.load.image('tower8.png', 'assets/tower8.png');

    setas = game.input.keyboard.createCursorKeys();
    wasd = {
      W: game.input.keyboard.addKey(Phaser.Keyboard.W),
      A: game.input.keyboard.addKey(Phaser.Keyboard.A),
      S: game.input.keyboard.addKey(Phaser.Keyboard.S),
      D: game.input.keyboard.addKey(Phaser.Keyboard.D)
    };
    btnSlow = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
  },

  create: function () {
    // music.play();
    if (!started) {
      music = game.add.audio('music', 1, true);
      // music.play();
      started = true;
    }
    sndExplosion = game.add.audio('explosion');
    sndGoal = game.add.audio('goal');
    sndPickup = game.add.audio('pickup');
    sndHit = game.add.audio('hit');

    game.physics.startSystem(Phaser.Physics.P2JS);
    // game.physics.p2.gravity.y = 1000;
    game.physics.p2.restitution = 0.1;

    bulletGroup = game.add.group();
    towerGroup = game.add.group();

    this.createTilemap();

    if (layerFundo) {
      game.world.bringToTop(layerFundo);
    }

    game.world.bringToTop(towerGroup);
    game.world.bringToTop(layerFrente);
    game.world.bringToTop(bulletGroup);
    game.world.bringToTop(player);

    debug = game.add.text(0, 0, '', { fill: '#ffffff', fontSize: '8pt' });
  },

  update: function () {
    debug.text = 'DEBUG: ';
  },

  mapGidsToObjects: function () {
    var mapping = {};

    map.imagecollections.forEach(function (collection) {
      collection.images.forEach(function (image) {
        mapping[image.gid] = image;
      });
    });

    return mapping;
  },

  createTilemap: function () {
    try {
      map = game.add.tilemap('fase' + this.params.level);
    } catch (e) {
      game.state.start('win', true, false);
      return;
    }

    var mapping = this.mapGidsToObjects();
    console.log(mapping);

    map.addTilesetImage('spritesheet', 'spritesheet');

    layerFundo = map.createLayer('fundo');
    layerFrente = map.createLayer('frente');

    map.setCollisionBetween(1, 899);
    game.physics.p2.convertTilemap(map, 'frente');

    map.objects.Objetos.forEach(function (obj) {
      // console.log(obj);
      // obj.y -= TILESIZE;
      if (obj.gid == FRAMES.PLAYER) { // player
        player = new Player(game, obj.x + TILESIZE / 2, obj.y - TILESIZE / 2);
        game.add.existing(player);
      } else if (obj.gid == FRAMES.TOWER) { // tower
        var tower;
        tower = new Tower(game, obj.x + TILESIZE / 2, obj.y - TILESIZE / 2, {x: 0.0, y: 0.0});
        tower.numBullets = 8;
        tower.timeLastExplosion = game.time.now - tower.period / 2;
        towerGroup.add(tower);
        gtower = obj; // debug
        if (obj.properties) {
          for (var k in obj.properties) {
            tower[k] = obj.properties[k];
          }
        }
      } else if (obj.gid in mapping) {
        var props = mapping[obj.gid];
        if (props.image.startsWith('tower')) {
          var tower;
          var texture = game.cache.getBaseTexture(props.image);
          console.log(obj.x);
          console.log(texture.width/2);
          tower = new Tower(game, obj.x + texture.width / 2, obj.y - texture.height / 2, {x: 0.0, y: 0.0});
          tower.numBullets = parseInt(props.image[5], 10);
          towerGroup.add(tower);
        }
      } else if (obj.gid == FRAMES.GOAL) { //goal
        var goal = game.add.sprite(obj.x + TILESIZE / 2, obj.y - TILESIZE / 2, 'spritesheet');
        goal.frame = FRAMES.GOAL - 1;
        game.physics.p2.enable(goal);
        goal.body.category = 'goal';
        goal.body.kinematic = true;
        goal.body.data.shapes[0].sensor = true;
      } else if (obj.gid == 901) {
        // console.log(obj);
      }
    });
  },
};

///////////////

function Player(game, x, y) {
  Phaser.Sprite.call(this, game, x, y, 'player');
  this.anchor = new Phaser.Point(0.5, 0.5);
  // this.frame = 171 - 1;
  
  this.slowDownFactor = 0.5;

  game.physics.p2.enable(this);
  // this.body.damping = 1.0;
  this.body.onBeginContact.add(this.handleCollision, this); 
  this.body.fixedRotation = true;

  this.speed = 3.0;
  this.connectedBullet = null;
  this.vel = { x: 0, y: 0 };
}
Player.prototype = Object.create(Phaser.Sprite.prototype);
Player.prototype.constructor = Player;

Player.prototype.handleCollision = function (bodyB, shapeA, shapeB, equation) {
  var key = bodyB && bodyB.sprite ? bodyB.sprite.key : null;
  if (key == 'tower') {
    sndPickup.play();
    bodyB.sprite.destroy();
  } else if (key == 'bullet') {
    sndHit.play();
    this.game.state.getCurrentState().restartLevel();
    bodyB.sprite.destroy();
  }

  if (bodyB.category == 'goal') {
    game.state.getCurrentState().nextLevel();
    sndGoal.play();
  }
}
Player.prototype.onClick = function () {
  this.centerX = this.game.input.mousePointer.x;
  this.centerY = this.game.input.mousePointer.y;
}
Player.prototype.update = function () {
  this.handleInput();

  debug.text += this.body.velocity.x.toFixed(1) + ", " + this.body.velocity.y.toFixed(1);
}
Player.prototype.handleInput = function () {
  this.body.velocity.x = 0;
  this.body.velocity.y = 0;

  var curSpeed = this.speed * (btnSlow.isDown ? this.slowDownFactor : 1.0);

  if (setas.right.isDown || wasd.D.isDown) {
    this.body.velocity.x += curSpeed;
  }
  if (setas.left.isDown || wasd.A.isDown) {
    this.body.velocity.x -= curSpeed;
  }
  if (setas.up.isDown || wasd.W.isDown) {
    this.body.velocity.y -= curSpeed;
  }
  if (setas.down.isDown || wasd.S.isDown) {
    this.body.velocity.y += curSpeed;
  }

  this.body.velocity.x *= TILESIZE;
  this.body.velocity.y *= TILESIZE;
}

///////

function Tower(game, x, y, vel) {
  Phaser.Sprite.call(this, game, x, y, 'tower');
  this.anchor = new Phaser.Point(0.5, 0.5);
  
  this.delay = 0;
  this.period = 2000;
  
  this.numBullets = 20;
  this.phase = 0; // degrees

  this.bulletSpeed = 2.5; // tiles per second
  this.bulletMaxDistance = 5.5; // tiles
  this.vel = vel;



  this.timeLastExplosion = this.game.time.now;
  this.firstExplosion = true;
  this.started = false;
  this.game.physics.p2.enable(this);
  this.body.kinematic = true;
  this.body.data.shapes[0].sensor = true;
  this.body.category = 'tower';
}

Tower.prototype = Object.create(Phaser.Sprite.prototype);
Tower.prototype.constructor = Tower;
Tower.prototype.update = function () {
  if (!this.started) {
    this.started = true;
    this.timeLastExplosion = this.game.time.now;
  }
  this.x += this.vel.x;
  this.y += this.vel.y;

  if (this.x > game.width) {
    this.vel.x = -this.vel.x;
  } else if (this.x < 0) {
    this.vel.x = -this.vel.x;
  }
  if (this.y > game.height) {
    this.vel.y = -this.vel.y;
  } else if (this.y < 0) {
    this.vel.y = -this.vel.y;
  }

  var now = this.game.time.now;
  // console.log(now - this.timeLastExplosion, this.delay);

  if (this.firstExplosion && now - this.timeLastExplosion > this.delay) {
    // console.log(now - this.timeLastExplosion, this.delay);
    this.timeLastExplosion = now;
    this.explode();
    this.firstExplosion = false;
  }
  if (!this.firstExplosion && now - this.timeLastExplosion > this.period) {
    this.timeLastExplosion = now;
    this.explode();
  }
}
Tower.prototype.explode = function() {
  var angle, bullet, vel;
  var phaseRadians = Math.PI * this.phase / 180.0;

  for (angle = phaseRadians; angle < 2 * Math.PI + phaseRadians; angle += 2.0 * Math.PI / this.numBullets) {
    vel = {
      x: this.bulletSpeed * TILESIZE * Math.cos(angle) + this.vel.x,
      y: this.bulletSpeed * TILESIZE * Math.sin(angle) + this.vel.y
    };
    bullet = new TowerBullet(game, this, vel);
    bullet.maxDistance = this.bulletMaxDistance;
    bulletGroup.add(bullet);
  }

  // sndExplosion.play();
}

////////

function TowerBullet(game, tower, vel) {
  Phaser.Sprite.call(this, game, 0, 0, 'bullet');
  this.anchor = new Phaser.Point(0.5, 0.5);
  this.tower = tower;
  this.vel = vel;
  this.creationTime = this.game.time.now;

  this.game.physics.p2.enable(this);
  this.body.category = 'bullet'
  this.body.kinematic = true;
  this.body.data.shapes[0].sensor = true;
  this.body.x = this.tower.centerX;
  this.body.y = this.tower.centerY;
  this.body.velocity.x = vel.x;
  this.body.velocity.y = vel.y;
}
TowerBullet.prototype = Object.create(Phaser.Sprite.prototype);
TowerBullet.prototype.constructor = TowerBullet;

TowerBullet.prototype.isOutOfBounds = function () {
  return this.centerX < 0 || this.centerX > this.game.width ||
    this.centerY < 0 || this.centerY > this.game.height;
}
TowerBullet.prototype.isLifespanComplete = function () {
  var dist = Phaser.Math.distance(this.centerX, this.centerY, this.tower.centerX, this.tower.centerY);
  return dist > this.tower.bulletMaxDistance * TILESIZE;
}
TowerBullet.prototype.update = function () {
  if (this.isLifespanComplete()) {
    this.destroy();
  }
}

/////////////////////////////////////////////////////////

var game = new Phaser.Game(400, 300, Phaser.AUTO, 'gamecanvas');
// game.state.add('menu', Scene.Menu);
game.state.add('game', Scene.Game);
game.state.add('win', Scene.Win);
game.state.start('game', true, false, {level: FIRST_LEVEL});
