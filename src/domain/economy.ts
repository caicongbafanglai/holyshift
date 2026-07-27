import {
  FOODS,
  PLAYER_COMBAT,
  type FoodId
} from '../data/content';
import type {
  EconomySaveState,
  PlayerSaveState
} from './save';

export type FoodDestination = 'use' | 'bag';

export interface EconomyResult {
  ok: boolean;
  reason:
    | 'ok'
    | 'unknown-food'
    | 'insufficient-codes'
    | 'inventory-full'
    | 'empty';
  foodId: FoodId | null;
}

export function isFoodId(value: unknown): value is FoodId {
  return typeof value === 'string' && Object.hasOwn(FOODS, value);
}

export function roundCodes(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function formatCodes(value: number): string {
  const rounded = roundCodes(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function getStaminaMaximum(player: PlayerSaveState): number {
  const food = isFoodId(player.activeStaminaFood)
    ? FOODS[player.activeStaminaFood]
    : null;
  return PLAYER_COMBAT.maxStamina + (food?.staminaBonus ?? 0);
}

export function grantCodes(
  economy: EconomySaveState,
  amount: number
): number {
  if (!Number.isFinite(amount) || amount <= 0) return economy.codes;
  const current = Number.isFinite(economy.codes)
    ? Math.max(0, economy.codes)
    : 0;
  economy.codes = roundCodes(
    Math.min(9_999_999.9, current + amount)
  );
  return economy.codes;
}

export function applyFoodBoost(
  player: PlayerSaveState,
  foodId: FoodId
): number {
  const food = FOODS[foodId];
  player.activeStaminaFood = foodId;
  const maximum = getStaminaMaximum(player);
  player.stamina = Math.min(
    maximum,
    Math.max(0, player.stamina) + food.staminaBonus
  );
  return maximum;
}

export function expireStaminaBoostIfDepleted(
  player: PlayerSaveState
): FoodId | null {
  if (player.stamina > 0 || !player.activeStaminaFood) return null;
  const expired = player.activeStaminaFood;
  player.stamina = 0;
  player.activeStaminaFood = null;
  return expired;
}

export function purchaseFood(
  economy: EconomySaveState,
  player: PlayerSaveState,
  value: unknown,
  destination: FoodDestination
): EconomyResult {
  if (!isFoodId(value)) {
    return { ok: false, reason: 'unknown-food', foodId: null };
  }
  const food = FOODS[value];
  if (roundCodes(economy.codes) < food.price) {
    return { ok: false, reason: 'insufficient-codes', foodId: value };
  }
  if (destination === 'bag') {
    const current = Number.isFinite(economy.inventory[value])
      ? Math.max(0, Math.floor(economy.inventory[value]))
      : 0;
    if (current >= 999) {
      return { ok: false, reason: 'inventory-full', foodId: value };
    }
    economy.codes = roundCodes(economy.codes - food.price);
    economy.inventory[value] = Math.min(
      999,
      current + 1
    );
  } else {
    economy.codes = roundCodes(economy.codes - food.price);
    applyFoodBoost(player, value);
  }
  return { ok: true, reason: 'ok', foodId: value };
}

export function consumeInventoryFood(
  economy: EconomySaveState,
  player: PlayerSaveState,
  value: unknown
): EconomyResult {
  if (!isFoodId(value)) {
    return { ok: false, reason: 'unknown-food', foodId: null };
  }
  const quantity = economy.inventory[value];
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { ok: false, reason: 'empty', foodId: value };
  }
  economy.inventory[value] = Math.floor(quantity) - 1;
  applyFoodBoost(player, value);
  return { ok: true, reason: 'ok', foodId: value };
}
