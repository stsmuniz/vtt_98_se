import { ref } from 'vue'

export type FormAttribute = { name: string; value: number }

export function useAttributeManager(initialAttributes: FormAttribute[] = []) {
    const attributes = ref<FormAttribute[]>([...initialAttributes])
    const attributeToInsert = ref<string | null>('')
    const attributeValueToInsert = ref<number>(0)

    function addAttribute() {
        if (!attributeToInsert.value) return
        attributes.value.push({
            name: attributeToInsert.value,
            value: attributeValueToInsert.value,
        })
        attributeToInsert.value = null
        attributeValueToInsert.value = 0
    }

    function removeAttribute(idx: number) {
        attributes.value.splice(idx, 1)
    }

    function setAttributes(newAttributes?: FormAttribute[] | null) {
        attributes.value = newAttributes ? [...newAttributes] : []
    }

    return { attributes, attributeToInsert, attributeValueToInsert, addAttribute, removeAttribute, setAttributes }
}
