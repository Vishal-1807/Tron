// GridCell.ts - Specialized component for minesweeper grid cells
import { Graphics, Sprite, Container, Texture, AnimatedSprite, Assets } from 'pixi.js';
import { createSpriteFromLoadedAssets } from './commons/Sprites';

interface GridCellOptions {
  // Basic cell properties
  texture: Texture | Sprite;
  width: number;
  height: number;
  x: number;
  y: number;
  
  // Cell identification
  cellId: string;
  row: number;
  col: number;
  
  // Callbacks
  onClick?: (row: number, col: number) => void;
}

export class GridCell {
  public container: Container;
  private bg: Sprite;
  private mainOverlay: Sprite;
  private cellId: string;
  private row: number;
  private col: number;
  
  // Overlay management
  private movableOverlays: { sprite: Sprite; offset: number; xOffsetRatio: number }[] = [];
  private mineOverlaySprite: Sprite | null = null;
  private bombOverlaySprite: Sprite | null = null;
  private grenadeIdleSprite: any = null;
  private greenFlagSprite: Sprite | null = null;
  private flagIdleSprite: any = null;
  
  // State tracking
  private isPressed: boolean = false;
  private pressedOffset: number = 0;
  private currentWidth: number;
  private currentHeight: number;
  
  // Overlay textures - declared internally
  private overlayTexture: Texture;
  private overlayTexture2: Texture;
  private overlayTexture3: Texture;
  private overlayTexture4: Texture | null = null;
  private overlayTexture5: Texture | null = null;
  private greenOverlayTexture: Texture | null = null;
  private mineOverlayTexture: Texture | null = null;
  private bombOverlayTexture: Texture | null = null;
  private greenFlagTexture: Texture | null = null;
  
  // Overlay offsets
  private overlayOffset: number;
  private overlayOffset2: number;
  private overlayOffset3: number;
  private overlayOffset4: number;
  private overlayOffset5: number;
  private mineOverlayOffset: number;
  private bombOverlayOffset: number;
  private greenFlagOffset: number;
  
  // Animation configurations
  private bombRevealAnimationName: string;
  private grenadeIdleAnimationName: string;
  private flagRevealAnimationName: string;
  private flagIdleAnimationName: string;
  
  constructor(options: GridCellOptions) {
    this.container = new Container();
    this.cellId = options.cellId;
    this.row = options.row;
    this.col = options.col;
    this.currentWidth = options.width;
    this.currentHeight = options.height;
    
    // Initialize overlay textures from Assets
    this.overlayTexture = Assets.get('tronBoxCover');
    this.overlayTexture2 = Assets.get('tronBoxBlueLight');
    this.overlayTexture3 = Assets.get('mineDamage');
    this.overlayTexture4 = Assets.get('grenade');
    this.overlayTexture5 = Assets.get('tronBoxRedLight');
    this.greenOverlayTexture = Assets.get('tronBoxGreenLight');
    this.greenFlagTexture = Assets.get('greenFlag');
    this.mineOverlayTexture = this.overlayTexture3; // Mine damage for clicked mines
    this.bombOverlayTexture = this.overlayTexture4; // Grenade for bomb reveals
    
    // Set overlay offsets based on cell size
    this.overlayOffset = options.width * 0.46;
    this.overlayOffset2 = -options.width * 0.001;
    this.overlayOffset3 = -options.width * 0.005;
    this.overlayOffset4 = -options.width * 0.16;
    this.overlayOffset5 = -options.width * 0.001;
    this.mineOverlayOffset = -options.width * 0.16;
    this.bombOverlayOffset = options.width * 0.02;
    this.greenFlagOffset = options.width * 0.015;
    
    // Set animation names
    this.bombRevealAnimationName = 'grenadeRevealSprite';
    this.grenadeIdleAnimationName = 'grenadeIdleSprite';
    this.flagRevealAnimationName = 'flagRevealSprite';
    this.flagIdleAnimationName = 'flagIdleSprite';
    
    this.initializeCell(options);
    this.setupEventListeners(options.onClick);
  }
  
  private initializeCell(options: GridCellOptions) {
    // Create background sprite
    this.bg = new Sprite(options.texture);
    const scaleX = options.width / this.bg.texture.width;
    const scaleY = options.height / this.bg.texture.height;
    this.bg.scale.set(scaleX, scaleY);
    this.container.addChild(this.bg);
    
    // Create main overlay (stationary)
    this.mainOverlay = new Sprite(this.overlayTexture);
    this.updateOverlay(this.mainOverlay, this.currentWidth, this.currentHeight, this.overlayOffset, -0.05);
    (this.mainOverlay as any).userData = { stationary: true, isMainOverlay: true };
    this.container.addChild(this.mainOverlay);
    
    // Create blue light overlay (movable)
    const overlay2 = new Sprite(this.overlayTexture2);
    this.updateOverlay(overlay2, this.currentWidth, this.currentHeight, this.overlayOffset2, 0);
    (overlay2 as any).userData = { movable: true, originalOffset: this.overlayOffset2 };
    this.container.addChild(overlay2);
    this.movableOverlays.push({ sprite: overlay2, offset: this.overlayOffset2, xOffsetRatio: 0 });
    
    // Set container position
    this.container.x = options.x;
    this.container.y = options.y;
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';
    this.container.sortableChildren = true;
  }
  
  private updateOverlay(overlay: any, targetWidth: number, targetHeight: number, yOffset: number, xOffsetRatio: number) {
    const userData = (overlay as any).userData;
    
    if (userData?.customSize && userData?.isMineOverlay) {
      // Mine overlay custom sizing
      overlay.width = targetWidth * 1.6;
      overlay.height = targetHeight * 1.6;
      overlay.x = targetWidth * -0.25;
    } else if (userData?.customSize && userData?.isBombOverlay) {
      // Bomb overlay custom sizing
      overlay.width = targetWidth * 0.5;
      overlay.height = targetHeight * 0.5;
      overlay.x = targetWidth * 0.26;
    } else if (userData?.customSize && userData?.isGreenFlagOverlay) {
      // Green flag overlay custom sizing
      overlay.width = targetWidth * 0.5;
      overlay.height = targetHeight * 0.5;
      overlay.x = targetWidth * 0.26;
    } else if (userData?.customSize && userData?.isFlagIdleOverlay) {
      // Flag idle animation custom sizing
      overlay.width = targetWidth * 0.5;
      overlay.height = targetHeight * 0.5;
      overlay.x = targetWidth * 0.26;
    } else if (userData?.customSize && userData?.isGrenadeIdleOverlay) {
      // Grenade idle animation custom sizing
      overlay.width = targetWidth * 0.5;
      overlay.height = targetHeight * 0.5;
      overlay.x = targetWidth * 0.26;
    } else if (userData?.isMainOverlay) {
      // Main overlay sizing
      overlay.width = targetWidth * 1.11;
      overlay.height = targetHeight;
      overlay.x = targetWidth * -0.05;
    } else {
      // Normal overlay sizing
      overlay.width = targetWidth;
      overlay.height = targetHeight;
      overlay.x = targetWidth * -0.001;
    }
    
    // Apply pressed offset to movable elements when they're added
    const finalYOffset = this.isPressed && userData?.movable ? this.pressedOffset + yOffset : yOffset;
    overlay.y = finalYOffset;
  }
  
  private setupEventListeners(onClick?: (row: number, col: number) => void) {
    // Click handler
    if (onClick) {
      this.container.on('pointertap', () => {
        onClick(this.row, this.col);
      });
    }
    
    // Internal event listeners for state changes
    this.container.on('addMineOverlay', this.addMineOverlay.bind(this));
    this.container.on('addBombOverlay', this.addBombOverlay.bind(this));
    this.container.on('addGreenFlag', this.addGreenFlag.bind(this));
    this.container.on('setPressedState', this.setPressedState.bind(this));
    this.container.on('switchToGreenOverlay', this.switchToGreenOverlay.bind(this));
    this.container.on('switchBackToOriginalOverlay', this.switchBackToOriginalOverlay.bind(this));
    this.container.on('resetToInitialState', this.resetToInitialState.bind(this));
    this.container.on('triggerAnimation', this.triggerAnimation.bind(this));
    this.container.on('playBlastAnimation', this.playBlastAnimation.bind(this));
  }
  
  private addMineOverlay() {
    if (this.mineOverlayTexture && !this.mineOverlaySprite) {
      this.mineOverlaySprite = new Sprite(this.mineOverlayTexture);
      this.mineOverlaySprite.zIndex = 5;
      
      const mineOverlayWidth = this.currentWidth * 1.6;
      const mineOverlayHeight = this.currentHeight * 1.6;
      
      this.mineOverlaySprite.width = mineOverlayWidth;
      this.mineOverlaySprite.height = mineOverlayHeight;
      this.mineOverlaySprite.x = this.currentWidth * -0.25;
      this.mineOverlaySprite.y = this.isPressed ? this.pressedOffset + this.mineOverlayOffset : this.mineOverlayOffset;
      
      (this.mineOverlaySprite as any).userData = {
        movable: true,
        originalOffset: this.mineOverlayOffset,
        isMineOverlay: true,
        customSize: true
      };
      
      this.container.addChild(this.mineOverlaySprite);
      this.movableOverlays.push({
        sprite: this.mineOverlaySprite,
        offset: this.mineOverlayOffset,
        xOffsetRatio: -0.25
      });
    }
  }
  
  private async addBombOverlay() {
    if (this.bombOverlayTexture && !this.bombOverlaySprite && !this.grenadeIdleSprite) {
      // Replace blue light with red light if available
      if (this.overlayTexture5) {
        const overlay2Index = this.movableOverlays.findIndex(item =>
          (item.sprite as any).userData?.originalOffset === this.overlayOffset2
        );

        if (overlay2Index !== -1) {
          const overlay2Item = this.movableOverlays[overlay2Index];
          const overlay2Sprite = overlay2Item.sprite;

          // Store original texture before replacement
          if (!(overlay2Sprite as any).originalTexture) {
            (overlay2Sprite as any).originalTexture = overlay2Sprite.texture;
          }

          overlay2Sprite.texture = this.overlayTexture5 instanceof Sprite ? this.overlayTexture5.texture : this.overlayTexture5;
          overlay2Item.offset = this.overlayOffset5;
          (overlay2Sprite as any).userData.originalOffset = this.overlayOffset5;
          (overlay2Sprite as any).userData.isRedReplacement = true;
          this.updateOverlay(overlay2Sprite, this.currentWidth, this.currentHeight, this.overlayOffset5, overlay2Item.xOffsetRatio);

          console.log(`Applied red light overlay to cell ${this.cellId}`);
        }
      }
      
      try {
        // Play bomb reveal animation
        const bombRevealSprite = await createSpriteFromLoadedAssets(this.bombRevealAnimationName, {
          x: this.currentWidth * 0.5,
          y: this.isPressed ? this.pressedOffset + this.bombOverlayOffset : this.bombOverlayOffset,
          width: this.currentWidth * 0.6,
          height: this.currentHeight * 0.6,
          animationSpeed: 0.6,
          loop: false,
          autoplay: true,
          anchor: 0.5
        });
        
        bombRevealSprite.zIndex = 6;
        (bombRevealSprite as any).userData = {
          movable: true,
          originalOffset: this.bombOverlayOffset,
          isBombOverlay: true,
          customSize: true,
          isAnimation: true
        };
        
        this.container.addChild(bombRevealSprite);
        this.movableOverlays.push({
          sprite: bombRevealSprite as any,
          offset: this.bombOverlayOffset,
          xOffsetRatio: 0.26
        });
        
        // When reveal animation completes, replace with idle animation
        bombRevealSprite.onComplete = async () => {
          try {
            this.grenadeIdleSprite = await createSpriteFromLoadedAssets(this.grenadeIdleAnimationName, {
              x: this.currentWidth * 0.5,
              y: this.isPressed ? this.pressedOffset + this.bombOverlayOffset : this.bombOverlayOffset,
              width: this.currentWidth * 0.5,
              height: this.currentHeight * 0.5,
              animationSpeed: 0.2,
              loop: true,
              autoplay: true,
              anchor: 0.5
            });
            
            this.grenadeIdleSprite.zIndex = 6;
            (this.grenadeIdleSprite as any).userData = {
              movable: true,
              originalOffset: this.bombOverlayOffset,
              isGrenadeIdleOverlay: true,
              customSize: true,
              isAnimation: true
            };
            
            // Remove reveal animation
            const revealIndex = this.movableOverlays.findIndex(item => item.sprite === bombRevealSprite);
            if (revealIndex !== -1) {
              this.movableOverlays.splice(revealIndex, 1);
            }
            this.container.removeChild(bombRevealSprite);
            bombRevealSprite.destroy();
            
            // Add idle animation
            this.container.addChild(this.grenadeIdleSprite);
            this.movableOverlays.push({
              sprite: this.grenadeIdleSprite as any,
              offset: this.bombOverlayOffset,
              xOffsetRatio: 0.26
            });
            
          } catch (error) {
            console.error('Failed to create grenade idle animation:', error);
            this.addStaticBombOverlay();
          }
        };
        
      } catch (error) {
        console.error('Failed to create bomb reveal animation:', error);
        this.addStaticBombOverlay();
      }
    }
  }
  
  private addStaticBombOverlay() {
    if (this.bombOverlayTexture && !this.bombOverlaySprite) {
      this.bombOverlaySprite = new Sprite(this.bombOverlayTexture);
      this.bombOverlaySprite.zIndex = 6;
      
      const bombOverlayWidth = this.currentWidth * 0.5;
      const bombOverlayHeight = this.currentHeight * 0.5;
      
      this.bombOverlaySprite.width = bombOverlayWidth;
      this.bombOverlaySprite.height = bombOverlayHeight;
      this.bombOverlaySprite.x = this.currentWidth * 0.26;
      this.bombOverlaySprite.y = this.isPressed ? this.pressedOffset + this.bombOverlayOffset : this.bombOverlayOffset;
      
      (this.bombOverlaySprite as any).userData = {
        movable: true,
        originalOffset: this.bombOverlayOffset,
        isBombOverlay: true,
        customSize: true
      };
      
      this.container.addChild(this.bombOverlaySprite);
      this.movableOverlays.push({
        sprite: this.bombOverlaySprite,
        offset: this.bombOverlayOffset,
        xOffsetRatio: 0.26
      });
    }
  }
  
  private async addGreenFlag() {
    if (this.greenFlagTexture && !this.greenFlagSprite && !this.flagIdleSprite) {
      try {
        // Play flag reveal animation
        const flagRevealSprite = await createSpriteFromLoadedAssets(this.flagRevealAnimationName, {
          x: this.currentWidth * 0.63,
          y: this.isPressed ? this.pressedOffset + this.greenFlagOffset : this.greenFlagOffset,
          width: this.currentWidth * 0.7,
          height: this.currentHeight * 0.7,
          animationSpeed: 0.6,
          loop: false,
          autoplay: true,
          anchor: 0.5
        });
        
        flagRevealSprite.zIndex = 7;
        (flagRevealSprite as any).userData = {
          movable: true,
          originalOffset: this.greenFlagOffset,
          isGreenFlagOverlay: true,
          customSize: true,
          isAnimation: true
        };
        
        this.container.addChild(flagRevealSprite);
        this.movableOverlays.push({
          sprite: flagRevealSprite as any,
          offset: this.greenFlagOffset,
          xOffsetRatio: 0.26
        });
        
        // When reveal animation completes, replace with idle animation
        flagRevealSprite.onComplete = async () => {
          try {
            this.flagIdleSprite = await createSpriteFromLoadedAssets(this.flagIdleAnimationName, {
              x: this.currentWidth * 0.63,
              y: this.isPressed ? this.pressedOffset + this.greenFlagOffset : this.greenFlagOffset,
              width: this.currentWidth * 0.7,
              height: this.currentHeight * 0.7,
              animationSpeed: 0.2,
              loop: true,
              autoplay: true,
              anchor: 0.5
            });
            
            this.flagIdleSprite.zIndex = 7;
            (this.flagIdleSprite as any).userData = {
              movable: true,
              originalOffset: this.greenFlagOffset,
              isFlagIdleOverlay: true,
              customSize: true,
              isAnimation: true
            };
            
            // Remove reveal animation
            const revealIndex = this.movableOverlays.findIndex(item => item.sprite === flagRevealSprite);
            if (revealIndex !== -1) {
              this.movableOverlays.splice(revealIndex, 1);
            }
            this.container.removeChild(flagRevealSprite);
            flagRevealSprite.destroy();
            
            // Add idle animation
            this.container.addChild(this.flagIdleSprite);
            this.movableOverlays.push({
              sprite: this.flagIdleSprite as any,
              offset: this.greenFlagOffset,
              xOffsetRatio: 0.26
            });
            
          } catch (error) {
            console.error('Failed to create flag idle animation:', error);
            this.addStaticGreenFlag();
          }
        };
        
      } catch (error) {
        console.error('Failed to create flag reveal animation:', error);
        this.addStaticGreenFlag();
      }
    }
  }
  
  private addStaticGreenFlag() {
    if (this.greenFlagTexture && !this.greenFlagSprite) {
      this.greenFlagSprite = new Sprite(this.greenFlagTexture);
      this.greenFlagSprite.zIndex = 7;
      
      const greenFlagWidth = this.currentWidth * 0.5;
      const greenFlagHeight = this.currentHeight * 0.5;
      
      this.greenFlagSprite.width = greenFlagWidth;
      this.greenFlagSprite.height = greenFlagHeight;
      this.greenFlagSprite.x = this.currentWidth * 0.32;
      this.greenFlagSprite.y = this.isPressed ? this.pressedOffset + this.greenFlagOffset : this.greenFlagOffset;
      
      (this.greenFlagSprite as any).userData = {
        movable: true,
        originalOffset: this.greenFlagOffset,
        isGreenFlagOverlay: true,
        customSize: true
      };
      
      this.container.addChild(this.greenFlagSprite);
      this.movableOverlays.push({
        sprite: this.greenFlagSprite,
        offset: this.greenFlagOffset,
        xOffsetRatio: 0.26
      });
    }
  }
  
  private setPressedState(offset: number) {
    this.isPressed = true;
    this.pressedOffset = offset;
    
    // Move background down
    this.bg.y = offset;
    
    // Move all movable overlays down (everything except main overlay which is stationary)
    this.movableOverlays.forEach(({ sprite, offset: originalOffset }) => {
      const userData = (sprite as any).userData;
      if (userData?.movable) {
        sprite.y = originalOffset + offset;
      }
    });
    
    // Move mine overlay if it exists
    if (this.mineOverlaySprite) {
      this.mineOverlaySprite.y = this.mineOverlayOffset + offset;
    }
    
    // Move bomb overlay if it exists
    if (this.bombOverlaySprite) {
      this.bombOverlaySprite.y = this.bombOverlayOffset + offset;
    }
    
    // Move grenade idle animation if it exists
    if (this.grenadeIdleSprite) {
      this.grenadeIdleSprite.y = this.bombOverlayOffset + offset;
    }
    
    // Move green flag if it exists
    if (this.greenFlagSprite) {
      this.greenFlagSprite.y = this.greenFlagOffset + offset;
    }
    
    // Move flag idle animation if it exists
    if (this.flagIdleSprite) {
      this.flagIdleSprite.y = this.greenFlagOffset + offset;
    }
    
    console.log(`Cell ${this.cellId} pressed - moved movable elements by ${offset}, main overlay stays stationary`);
  }
  
  private switchToGreenOverlay() {
    const overlay2Index = this.movableOverlays.findIndex(item => {
      const userData = (item.sprite as any).userData;
      return userData?.originalOffset === this.overlayOffset2 && !userData?.isTemporaryGreen;
    });
    
    if (overlay2Index !== -1 && this.greenOverlayTexture) {
      const overlay2Item = this.movableOverlays[overlay2Index];
      const overlay2Sprite = overlay2Item.sprite;
      
      if ((overlay2Sprite as any).userData?.isTemporaryGreen) {
        return;
      }
      
      (overlay2Sprite as any).originalTexture = overlay2Sprite.texture;
      overlay2Sprite.texture = this.greenOverlayTexture instanceof Sprite ? this.greenOverlayTexture.texture : this.greenOverlayTexture;
      (overlay2Sprite as any).userData.isTemporaryGreen = true;
    }
  }
  
  private switchBackToOriginalOverlay() {
    const overlay2Index = this.movableOverlays.findIndex(item =>
      (item.sprite as any).userData?.isTemporaryGreen === true
    );
    
    if (overlay2Index !== -1) {
      const overlay2Item = this.movableOverlays[overlay2Index];
      const overlay2Sprite = overlay2Item.sprite;
      
      const originalTexture = (overlay2Sprite as any).originalTexture;
      if (originalTexture) {
        overlay2Sprite.texture = originalTexture;
        (overlay2Sprite as any).userData.isTemporaryGreen = false;
        delete (overlay2Sprite as any).originalTexture;
      }
    }
  }
  
  private resetToInitialState() {
    // Reset pressed state
    if (this.isPressed) {
      // Reset background position
      this.bg.y = 0;
      
      // Reset all movable overlays to original positions
      this.movableOverlays.forEach(({ sprite, offset }) => {
        const userData = (sprite as any).userData;
        if (userData?.movable) {
          sprite.y = offset;
        }
      });
      
      // Reset mine overlay if it exists
      if (this.mineOverlaySprite) {
        this.mineOverlaySprite.y = this.mineOverlayOffset;
      }
      
      // Reset bomb overlay if it exists
      if (this.bombOverlaySprite) {
        this.bombOverlaySprite.y = this.bombOverlayOffset;
      }
      
      // Reset grenade idle animation if it exists
      if (this.grenadeIdleSprite) {
        this.grenadeIdleSprite.y = this.bombOverlayOffset;
      }
      
      // Reset green flag if it exists
      if (this.greenFlagSprite) {
        this.greenFlagSprite.y = this.greenFlagOffset;
      }
      
      // Reset flag idle animation if it exists
      if (this.flagIdleSprite) {
        this.flagIdleSprite.y = this.greenFlagOffset;
      }
      
      this.isPressed = false;
      this.pressedOffset = 0;
    }
    
    // Remove dynamically added overlays
    this.removeOverlay('mine');
    this.removeOverlay('bomb');
    this.removeOverlay('grenadeIdle');
    this.removeOverlay('greenFlag');
    this.removeOverlay('flagIdle');
    
    // Reset texture replacements
    this.resetTextureReplacements();
    
    // Re-enable interaction
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';
    
    console.log(`Cell ${this.cellId} reset to initial state`);
  }
  
  private removeOverlay(type: string) {
    let sprite: any = null;
    let overlayIndex = -1;

    switch (type) {
      case 'mine':
        sprite = this.mineOverlaySprite;
        this.mineOverlaySprite = null;
        break;
      case 'bomb':
        sprite = this.bombOverlaySprite;
        this.bombOverlaySprite = null;
        break;
      case 'grenadeIdle':
        sprite = this.grenadeIdleSprite;
        this.grenadeIdleSprite = null;
        break;
      case 'greenFlag':
        sprite = this.greenFlagSprite;
        this.greenFlagSprite = null;
        break;
      case 'flagIdle':
        sprite = this.flagIdleSprite;
        this.flagIdleSprite = null;
        break;
    }

    if (sprite) {
      overlayIndex = this.movableOverlays.findIndex(item => item.sprite === sprite);
      if (overlayIndex !== -1) {
        this.movableOverlays.splice(overlayIndex, 1);
      }

      // Defensive check: only remove if sprite is actually a child
      if (sprite.parent === this.container) {
        this.container.removeChild(sprite);
      }

      // Stop animations if available
      if (sprite.stop) {
        sprite.stop();
      }

      // Destroy sprite to free memory and prevent lingering references
      if (sprite.destroy) {
        sprite.destroy();
      }

      console.log(`Removed and destroyed ${type} overlay from cell ${this.cellId}`);
    }
  }
  
  private resetTextureReplacements() {
    // Find the blue light overlay (overlay2) that might have been replaced
    const overlay2Index = this.movableOverlays.findIndex(item => {
      const userData = (item.sprite as any).userData;
      return userData?.originalOffset === this.overlayOffset2 || userData?.originalOffset === this.overlayOffset5;
    });

    if (overlay2Index !== -1) {
      const overlay2Item = this.movableOverlays[overlay2Index];
      const overlay2Sprite = overlay2Item.sprite;

      // Reset to original blue light texture
      overlay2Sprite.texture = this.overlayTexture2;

      // Reset position and offset to original blue light values
      overlay2Item.offset = this.overlayOffset2;
      overlay2Sprite.y = this.isPressed ? this.pressedOffset + this.overlayOffset2 : this.overlayOffset2;

      // Reset user data
      if ((overlay2Sprite as any).userData) {
        (overlay2Sprite as any).userData.originalOffset = this.overlayOffset2;
        (overlay2Sprite as any).userData.isTemporaryGreen = false;
        delete (overlay2Sprite as any).userData.isRedReplacement;
      }

      // Clear any stored original texture
      delete (overlay2Sprite as any).originalTexture;

      // Update overlay positioning
      this.updateOverlay(overlay2Sprite, this.currentWidth, this.currentHeight, this.overlayOffset2, 0);

      console.log(`Reset texture replacements for cell ${this.cellId} - restored blue light overlay`);
    }
  }
  
  private async triggerAnimation(animationName: string) {
    try {
      const animSprite = await createSpriteFromLoadedAssets(animationName, {
        x: this.container.x + this.currentWidth * 0.3,
        y: this.container.y - this.currentHeight * 0.10,
        width: this.currentWidth * 0.8,
        height: this.currentHeight * 0.8,
        animationSpeed: 0.35,
        loop: false,
        autoplay: true,
        anchor: 0.5
      });

      const parentContainer = this.container.parent?.parent;
      if (parentContainer) {
        parentContainer.addChild(animSprite);

        if (!animSprite.loop) {
          animSprite.onComplete = () => {
            if (animSprite.parent) {
              animSprite.parent.removeChild(animSprite);
            }
            animSprite.stop();
            animSprite.destroy();
          };
        }
      }
    } catch (error) {
      console.error('Failed to load animation:', error);
    }
  }

  private async playBlastAnimation() {
    try {
      console.log('💥 Playing blast animation for mine hit');

      // Create blast sprite positioned similar to mine overlay
      const blastSprite = await createSpriteFromLoadedAssets('blastSprite', {
        x: this.currentWidth * -0.25, // Same x position as mine overlay
        y: this.pressedOffset * -4,
        width: this.currentWidth * 1.6, // Same size as mine overlay
        height: this.currentHeight * 1.6, // Same size as mine overlay
        animationSpeed: 0.5,
        loop: false,
        autoplay: true,
        anchor: 0
      });

      blastSprite.zIndex = 10; // Higher than mine overlay to appear on top
      (blastSprite as any).userData = {
        movable: true,
        originalOffset: this.mineOverlayOffset,
        isBlastAnimation: true,
        customSize: true,
        isAnimation: true
      };

      this.container.addChild(blastSprite);

      // Add to movable overlays so it moves with pressed state
      this.movableOverlays.push({
        sprite: blastSprite as any,
        offset: this.mineOverlayOffset,
        xOffsetRatio: -0.25
      });

      // Remove blast animation when complete
      blastSprite.onComplete = () => {
        console.log('💥 Blast animation completed, removing sprite');

        // Remove from movable overlays
        const blastIndex = this.movableOverlays.findIndex(item => item.sprite === blastSprite);
        if (blastIndex !== -1) {
          this.movableOverlays.splice(blastIndex, 1);
        }

        // Remove from container and destroy
        if (blastSprite.parent) {
          blastSprite.parent.removeChild(blastSprite);
        }
        blastSprite.stop();
        blastSprite.destroy();
      };

    } catch (error) {
      console.error('Failed to create blast animation:', error);
    }
  }
  
  // Public methods
  public getCellId(): string {
    return this.cellId;
  }
  
  public getPosition(): { row: number; col: number } {
    return { row: this.row, col: this.col };
  }
  
  public resize(width: number, height: number) {
    this.currentWidth = width;
    this.currentHeight = height;
    
    // Resize background
    const scaleX = width / this.bg.texture.width;
    const scaleY = height / this.bg.texture.height;
    this.bg.scale.set(scaleX, scaleY);
    
    // Resize main overlay
    this.updateOverlay(this.mainOverlay, width, height, (this.mainOverlay as any).userData.originalOffset || 0, -0.05);
    
    // Resize all movable overlays
    this.movableOverlays.forEach(({ sprite, offset, xOffsetRatio }) => {
      this.updateOverlay(sprite, width, height, offset, xOffsetRatio);
    });
  }
  
  public destroy() {
    // Clean up all animations
    if (this.grenadeIdleSprite) {
      if (this.grenadeIdleSprite.stop) {
        this.grenadeIdleSprite.stop();
      }
      if (this.grenadeIdleSprite.destroy) {
        this.grenadeIdleSprite.destroy();
      }
    }
    
    if (this.flagIdleSprite) {
      if (this.flagIdleSprite.stop) {
        this.flagIdleSprite.stop();
      }
      if (this.flagIdleSprite.destroy) {
        this.flagIdleSprite.destroy();
      }
    }
    
    // Destroy container
    this.container.destroy();
  }
}

export function createGridCell(options: GridCellOptions): Container {
  const gridCell = new GridCell(options);
  return gridCell.container;
}