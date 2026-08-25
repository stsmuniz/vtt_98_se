import type { Ref } from 'vue'

export function useTokenTransform(tokens: Ref<any[]>, stageRef: Ref<any>, transformerRef: Ref<any>) {
    function handleTransformEnd(e: any, tokenId: number) {
        const node = e.target
        const targetToken = tokens.value.find(t => t.id === tokenId)
        if (!targetToken) return

        const scaleX = node.scaleX()
        const scaleY = node.scaleY()

        const newWidth = Math.max(20, node.width() * Math.abs(scaleX))
        const newHeight = Math.max(20, node.height() * Math.abs(scaleY))

        const currentSignX = scaleX < 0 ? -1 : 1
        const currentSignY = scaleY < 0 ? -1 : 1

        targetToken.scaleX = (targetToken.scaleX < 0 ? -1 : 1) * currentSignX
        targetToken.scaleY = (targetToken.scaleY < 0 ? -1 : 1) * currentSignY

        targetToken.rotation = node.rotation()

        node.scaleX(targetToken.scaleX)
        node.scaleY(targetToken.scaleY)

        targetToken.width = newWidth
        targetToken.height = newHeight

        const groupNode = node.getParent()
        if (groupNode) {
            const centerX = groupNode.x() + node.x()
            const centerY = groupNode.y() + node.y()

            targetToken.x = centerX - (newWidth / 2)
            targetToken.y = centerY - (newHeight / 2)
        }
    }

    function handleDragEnd(e: any, tokenId: number) {
        const targetToken = tokens.value.find(t => t.id === tokenId)
        if (!targetToken) return

        const pos = e.target.position()
        targetToken.x = pos.x
        targetToken.y = pos.y
    }

    function hFlipToken(tokenId: number) {
        const targetToken = tokens.value.find(t => t.id === tokenId)
        if (!targetToken) return

        targetToken.scaleX = (targetToken.scaleX ?? 1) * -1

        const stageNode = stageRef.value.getNode()
        const node = stageNode.findOne(`#token-${tokenId}`)
        if (node) {
            node.scaleX(targetToken.scaleX)
            stageNode.batchDraw()
        }
    }

    function vFlipToken(tokenId: number) {
        const targetToken = tokens.value.find(t => t.id === tokenId)
        if (!targetToken) return

        targetToken.scaleY = (targetToken.scaleY ?? 1) * -1

        const stageNode = stageRef.value.getNode()
        const node = stageNode.findOne(`#token-${tokenId}`)
        if (node) {
            node.scaleY(targetToken.scaleY)
            stageNode.batchDraw()
        }
    }

    function resetTokenRotation(tokenId: number) {
        const targetToken = tokens.value.find(t => t.id === tokenId)
        if (!targetToken) return

        targetToken.rotation = 0

        const stageNode = stageRef.value.getNode()
        if (!stageNode) return

        const imageNode = stageNode.findOne(`#token-${tokenId}`)
        if (imageNode) {
            imageNode.rotation(0)
            stageNode.batchDraw()

            if (transformerRef.value) {
                transformerRef.value.getNode().forceUpdate()
            }
        }
    }

    return { handleTransformEnd, handleDragEnd, hFlipToken, vFlipToken, resetTokenRotation }
}
