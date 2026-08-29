<script setup lang="ts">
import {roll, type RollResult, type RollType} from "~~/lib/rollDice.ts";

const quantity = ref(1)
const dice = ref('4')
const mod = ref(0)
const modSignal = ref('+')
const diceString = computed(() => `${quantity.value}d${dice.value}${modSignal.value}${mod.value}`)
const rollType = ref<RollType>('s')
const validDice = ['4', '6', '8', '10', '12', '20']
const lastRolls = ref<RollResult[]>([])
const rollResult = ref<RollResult | null>(null)

function rollDice() {
  const newRoll = roll(diceString.value, rollType.value)
  rollResult.value = newRoll
  lastRolls.value.unshift(newRoll)
}

function clearRollHistory() {
  lastRolls.value = []
  rollResult.value = null
}
</script>
<template>
  <session class="dice-roller-container">
    <div class="dice-selector">
      <fieldset>
        <legend>Escolha o dado</legend>
        <button class="dice-selector-button" v-for="d in validDice" :key="d">
          <icon
              size="lg"
              :name="`D${d}`"
              :icon="`dices/d${d}`"
              @click="dice = d" />
        </button>
      </fieldset>
    </div>
    <div class="modifiers">
      <fieldset>
        <legend>Configurações</legend>
        <div class="attribute-container">
          <label for="dice-quantity">Quantidade</label>
          <div class="value-modifier">
            <input class="attribute-item" v-model="quantity" type="number" id="dice-quantity" name="quantity" min="1" size="2" />
          </div>
        </div>
        <div class="attribute-container">
          <label for="dice-faces">Faces</label>
          <div class="value-modifier">
            <input class="attribute-item" v-model="dice" type="text" disabled id="dice-faces" name="dice-faces" min="1" size="4" />
          </div>
        </div>
        <div class="attribute-container">
          <label for="dice-mod">Modificadores</label>
          <div class="value-modifier">
            <div class="signal-mod-container">
              <div class="signal-mod">
                <input type="radio" v-model="modSignal" value="-" name="signal-mod" id="signal-minus">
                <label for="signal-minus">-</label>
              </div>
              <div class="signal-mod">
                <input type="radio" v-model="modSignal" value="+" name="signal-mod" id="signal-plus">
                <label for="signal-plus">+</label>
              </div>
            </div>
            <input class="attribute-item" v-model="mod" type="number" id="dice-mod" name="dice-mod" min="1" size="4" />
          </div>
        </div>
        <div class="attribute-container">
          <label for="dice-faces">Tipo de Rolagem</label>
          <div class="value-modifier">
            <select v-model="rollType" name="roll-type" id="roll-type">
              <option value="s">Soma</option>
              <option value="h">Maior</option>
            </select>
          </div>
        </div>
        <div class="attribute-container">
          <button class="roll-button" @click.prevent="rollDice">Rolar</button>
        </div>
      </fieldset>
      <fieldset>
        <legend>Resultado</legend>
        <div class="result-container">
          <span style="font-size: 3rem">{{rollResult ? rollResult.result : '—'}}</span>
        </div>
      </fieldset>
      <fieldset>
        <legend>Histórico</legend>
        <div class="history-container">
          <div class="last-rolls">
            <div class="roll-result" v-for="(roll, index) in lastRolls" :key="index">
              <span class="result">Resultado: {{roll.result}}</span>
              <span class="rolls">Dados rolados: {{roll.rolls.join(', ')}}</span>
              <span class="input">Formula: {{roll.input}}</span>
              <span class="roll-type">Tipo: {{roll.type == 's' ? 'Soma' : 'Maior'}}</span>
            </div>
          </div>
          <button @click.prevent="clearRollHistory">Limpar Histórico</button>
        </div>
      </fieldset>
    </div>
  </session>
</template>
<style lang="css" scoped>
.dice-roller-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  .dice-selector{
    display: flex;
    gap: 0.25rem;
    .dice-selector-button {
      padding: 0.5rem;
      button {
        padding: 4px; box-sizing: border-box; margin: 0.25rem;
      }
    }
  }
  .modifiers {
    width: 100%;
    fieldset {
      display: flex;
      gap: 1rem;
      flex-direction: row;
      align-items: end;
      .attribute-container {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        align-items: center;
        .value-modifier {
          display: flex;
          .attribute-item {
            width: 3rem;
            text-align: center;
            font-size: 2rem;
            height: 2.5rem;
            padding: 0.25rem;
          }
          select {
            font-size: 2rem;
            height: 2.5rem;
          }
        }
        .roll-button {
          font-size: 1.8rem;
          height: 2.5rem;
        }
      }
    }
  }
  .result-container {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 3rem;
  }
  .history-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    .last-rolls {
      overflow-y: scroll;
      width: 100%;
      border: 2px solid;
      border-color: #808080 #dfdfdf #dfdfdf #808080;
      background-color: #efefef;
      min-height: 8rem;
      max-height: 8rem;
      padding: 0.25rem;
      align-items: center;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      .roll-result {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.25rem;
        border: 1px solid #050400;
        background-color: #feffe0;
        border-radius: 0.25rem;
        width: 95%;
      }
    }
  }
}
</style>