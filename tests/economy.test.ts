import { describe, expect, it } from 'vitest';
import {
  FOODS,
  PLAYER_COMBAT
} from '../src/data/content';
import {
  consumeInventoryFood,
  expireStaminaBoostIfDepleted,
  formatCodes,
  getStaminaMaximum,
  grantCodes,
  purchaseFood
} from '../src/domain/economy';
import { createNewSave } from '../src/domain/save';

describe('Pingu food economy and temporary stamina boosts', () => {
  it('uses the exact prices and decimal-safe 码 arithmetic', () => {
    const save = createNewSave('economy-test');
    grantCodes(save.economy, 91);

    expect(
      purchaseFood(
        save.economy,
        save.player,
        'forgetfulBeefNoodles',
        'bag'
      ).ok
    ).toBe(true);
    expect(save.economy.codes).toBe(63.2);
    expect(formatCodes(save.economy.codes)).toBe('63.2');
    expect(save.economy.inventory.forgetfulBeefNoodles).toBe(1);
  });

  it('rejects unknown, unaffordable and empty inventory operations atomically', () => {
    const save = createNewSave('economy-test');
    expect(
      purchaseFood(save.economy, save.player, 'genghisChicken', 'use').reason
    ).toBe('insufficient-codes');
    expect(
      purchaseFood(save.economy, save.player, '<script>', 'bag').reason
    ).toBe('unknown-food');
    expect(
      purchaseFood(save.economy, save.player, 'toString', 'bag').reason
    ).toBe('unknown-food');
    expect(
      consumeInventoryFood(save.economy, save.player, 'redSausage').reason
    ).toBe('empty');
    expect(save.economy.codes).toBe(0);
    expect(save.player.activeStaminaFood).toBeNull();
  });

  it('never charges for a full backpack slot or accepts non-finite balances', () => {
    const save = createNewSave('economy-test');
    save.economy.codes = Number.NaN;
    expect(
      purchaseFood(save.economy, save.player, 'redSausage', 'bag').reason
    ).toBe('insufficient-codes');
    grantCodes(save.economy, 100);
    save.economy.inventory.redSausage = 999;
    expect(
      purchaseFood(save.economy, save.player, 'redSausage', 'bag').reason
    ).toBe('inventory-full');
    expect(save.economy.codes).toBe(100);
  });

  it.each([
    ['redSausage', 27.8],
    ['forgetfulBeefNoodles', 91],
    ['genghisChicken', 278]
  ] as const)(
    'applies %s until stamina reaches zero, then returns to the base maximum',
    (foodId, bonus) => {
      const save = createNewSave('economy-test');
      grantCodes(save.economy, FOODS[foodId].price);
      expect(
        purchaseFood(save.economy, save.player, foodId, 'use').ok
      ).toBe(true);
      expect(getStaminaMaximum(save.player)).toBe(
        PLAYER_COMBAT.maxStamina + bonus
      );
      expect(save.player.stamina).toBe(
        PLAYER_COMBAT.maxStamina + bonus
      );

      save.player.stamina = 0.01;
      expect(expireStaminaBoostIfDepleted(save.player)).toBeNull();
      save.player.stamina = 0;
      expect(expireStaminaBoostIfDepleted(save.player)).toBe(foodId);
      expect(save.player.activeStaminaFood).toBeNull();
      expect(getStaminaMaximum(save.player)).toBe(PLAYER_COMBAT.maxStamina);
    }
  );
});
