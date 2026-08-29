import { ref } from 'vue'
import type { Attribute, SceneAttribute } from '#server/db/schema.ts'

export function useRoomTokenAttributes() {
    const attributes = ref<SceneAttribute[]>([])

    function loadFromToken(tokenAttributes?: Attribute[] | null) {
        attributes.value = (tokenAttributes ?? []).map(attribute => ({
            ...attribute,
            currentValue: attribute.value,
            maxValue: attribute.value,
            visibility: 'visible' as const,
        }))
    }

    return { attributes, loadFromToken }
}
