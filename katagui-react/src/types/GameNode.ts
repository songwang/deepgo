import { makeObservable, observable, action } from 'mobx';
import type { Move } from './game';

export class GameNode {
  move: Move;
  parent: GameNode | null;
  children: GameNode[] = [];
  mainLineChildIndex: number = 0;

  constructor(move: Move, parent: GameNode | null) {
    this.move = move;
    this.parent = parent;

    makeObservable(this, {
      move: observable,
      children: observable,
      mainLineChildIndex: observable,
      addChild: action,
    });
  }

  addChild(move: Move): GameNode {
    const newNode = new GameNode(move, this);
    this.children.push(newNode);
    return newNode;
  }

  get mainLineChild(): GameNode | undefined {
    return this.children[this.mainLineChildIndex];
  }
}
