import type { NoteImage } from '@/types'

/** Работа с DOM редактора заметок (contenteditable).
 *
 * Формат текста:
 *  - абзацы <p>, внутри <b>, <i>, <u>;
 *  - списки <ul>, <ol>, чек-лист — <ul data-type="checklist"> с <li data-checked="true">;
 *  - фото — <figure data-image-id data-align="left|right" data-size="s|m|l">
 *    с <img data-image-id> и <figcaption>. Фигура всегда лежит на верхнем уровне
 *    редактора и обтекается следующими за ней блоками (float).
 */

export type ListKind = 'bulleted' | 'numbered' | 'checklist'
export type FigureAlign = 'left' | 'right'
export type FigureSize = 's' | 'm' | 'l'

export const CAPTION_PLACEHOLDER = 'Подпись к фото'

const BLOCK_TAGS = new Set(['P', 'DIV', 'UL', 'OL', 'FIGURE', 'H1', 'H2', 'H3', 'BLOCKQUOTE'])

const emptyParagraph = () => {
    const p = document.createElement('p')
    p.appendChild(document.createElement('br'))
    return p
}

export const isFigure = (node: Node | null): node is HTMLElement =>
    node instanceof HTMLElement && node.tagName === 'FIGURE'

/** Свободный текст на верхнем уровне заворачиваем в абзацы, после фото оставляем строку */
export const normalizeEditor = (editor: HTMLElement) => {
    let paragraph: HTMLParagraphElement | null = null
    for (const node of Array.from(editor.childNodes)) {
        const isBlock = node instanceof HTMLElement && BLOCK_TAGS.has(node.tagName)
        const isBlankText = node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()
        if (isBlock) {
            paragraph = null
            continue
        }
        if (isBlankText && !paragraph) {
            node.remove()
            continue
        }
        if (!paragraph) {
            paragraph = document.createElement('p')
            editor.insertBefore(paragraph, node)
        }
        paragraph.appendChild(node)
    }
    if (!editor.lastElementChild || isFigure(editor.lastElementChild)) {
        editor.appendChild(emptyParagraph())
    }
}

/** Подготовить фигуру к редактированию: картинку не редактируем, подпись — да */
const prepareFigure = (figure: HTMLElement, src?: string) => {
    figure.contentEditable = 'false'
    figure.dataset.align = figure.dataset.align === 'left' ? 'left' : 'right'
    if (!['s', 'm', 'l'].includes(figure.dataset.size ?? '')) figure.dataset.size = 'm'
    const img = figure.querySelector('img')
    if (img) {
        if (src) img.src = src
        img.draggable = false
        img.alt = ''
    }
    let caption = figure.querySelector('figcaption')
    if (!caption) {
        caption = document.createElement('figcaption')
        figure.appendChild(caption)
    }
    caption.contentEditable = 'true'
    caption.dataset.placeholder = CAPTION_PLACEHOLDER
    if (!caption.textContent?.trim()) caption.innerHTML = ''
}

/** HTML с сервера -> DOM редактора (у фото с сервера нет src, только id) */
export const hydrateEditor = (editor: HTMLElement, html: string, images: NoteImage[]) => {
    const urls = new Map(images.map(image => [String(image.id), image.url]))
    editor.innerHTML = html
    editor.querySelectorAll<HTMLElement>('figure').forEach(figure => {
        const id = figure.dataset.imageId ?? figure.querySelector('img')?.dataset.imageId
        const src = id ? urls.get(id) : undefined
        if (!src || !figure.querySelector('img')) {
            figure.remove()
            return
        }
        prepareFigure(figure, src)
    })
    normalizeEditor(editor)
}

export const createFigure = (image: NoteImage) => {
    const figure = document.createElement('figure')
    figure.dataset.imageId = String(image.id)
    figure.dataset.align = 'right'
    figure.dataset.size = 'm'
    const img = document.createElement('img')
    img.dataset.imageId = String(image.id)
    figure.appendChild(img)
    prepareFigure(figure, image.url)
    return figure
}

/** Блок верхнего уровня, в котором находится узел */
export const topLevelBlock = (editor: HTMLElement, node: Node | null): Element | null => {
    let current: Node | null = node
    while (current && current.parentNode !== editor) current = current.parentNode
    return current instanceof Element ? current : null
}

/** Вставить фото перед абзацем с курсором: текст после него обтекает фото */
export const insertFigure = (editor: HTMLElement, figure: HTMLElement, range: Range | null) => {
    normalizeEditor(editor)
    const inside = range && editor.contains(range.startContainer) ? range.startContainer : null
    const block = topLevelBlock(editor, inside)
    editor.insertBefore(figure, block ?? editor.lastElementChild)
    normalizeEditor(editor)
}

export const isEditorEmpty = (editor: HTMLElement | null) =>
    !editor || (!editor.textContent?.trim() && !editor.querySelector('figure'))

/* ===== Списки ===== */

const selectionNode = (editor: HTMLElement): Node | null => {
    const selection = window.getSelection()
    const node = selection?.anchorNode ?? null
    return node && editor.contains(node) ? node : null
}

const closestElement = (node: Node | null, selector: string, editor: HTMLElement) => {
    const element = node instanceof Element ? node : node?.parentElement
    const found = element?.closest(selector) ?? null
    return found && editor.contains(found) ? found as HTMLElement : null
}

export const currentListKind = (editor: HTMLElement): ListKind | null => {
    const list = closestElement(selectionNode(editor), 'ul, ol', editor)
    if (!list) return null
    if (list.tagName === 'OL') return 'numbered'
    return list.dataset.type === 'checklist' ? 'checklist' : 'bulleted'
}

const listKindOf = (list: Element | null): ListKind | null => {
    if (!list) return null
    if (list.tagName === 'OL') return 'numbered'
    if (list.tagName !== 'UL') return null
    return (list as HTMLElement).dataset.type === 'checklist' ? 'checklist' : 'bulleted'
}

const makeList = (kind: ListKind) => {
    const list = document.createElement(kind === 'numbered' ? 'ol' : 'ul')
    if (kind === 'checklist') list.dataset.type = 'checklist'
    return list
}

/** Переносим детей узла в новый элемент: текстовые узлы те же, выделение можно вернуть */
const moveChildren = (from: Element, to: Element) => {
    while (from.firstChild) to.appendChild(from.firstChild)
    if (!to.firstChild) to.appendChild(document.createElement('br'))
}

/** Строки, которых касается выделение: пункты списков и абзацы верхнего уровня */
const selectedLines = (editor: HTMLElement, range: Range): HTMLElement[] => {
    const lines: HTMLElement[] = []
    Array.from(editor.children).forEach(block => {
        if (!range.intersectsNode(block)) return
        if (block.tagName === 'UL' || block.tagName === 'OL') {
            Array.from(block.children).forEach(li => {
                if (li.tagName === 'LI' && range.intersectsNode(li)) lines.push(li as HTMLElement)
            })
        } else if (block.tagName === 'P' || block.tagName === 'DIV') {
            lines.push(block as HTMLElement)
        }
    })
    return lines
}

/** Отделить от списка пункты перед li: они уходят в такой же список выше */
const splitListBefore = (li: Element) => {
    const list = li.parentElement
    if (!list || !li.previousElementSibling) return
    const head = list.cloneNode(false) as HTMLElement
    list.parentNode?.insertBefore(head, list)
    while (list.firstElementChild && list.firstElementChild !== li) {
        head.appendChild(list.firstElementChild)
    }
}

const removeIfEmpty = (list: Element | null) => {
    if (list && !list.children.length) list.remove()
}

/** Переключить список у выделенных строк. Повторное нажатие того же списка его убирает.
 * Делаем это вручную: execCommand в Chrome вкладывает список в <p> и сливает соседние списки */
export const toggleList = (editor: HTMLElement, kind: ListKind) => {
    const selection = window.getSelection()
    if (!selection?.rangeCount) return
    normalizeEditor(editor)
    const range = selection.getRangeAt(0)
    const lines = selectedLines(editor, range)
    if (!lines.length) return

    const saved = {
        sc: range.startContainer, so: range.startOffset,
        ec: range.endContainer, eo: range.endOffset,
    }
    // Абзацы заменяются пунктами (и наоборот): запоминаем, во что превратился контейнер
    const replaced = new Map<Node, Node>()
    const replace = (from: Element, to: Element) => {
        moveChildren(from, to)
        replaced.set(from, to)
    }

    const removeList = lines.every(line =>
        line.tagName === 'LI' && listKindOf(line.parentElement) === kind)

    if (removeList) {
        lines.forEach(li => {
            const list = li.parentElement!
            splitListBefore(li)
            const p = document.createElement('p')
            replace(li, p)
            editor.insertBefore(p, list)
            li.remove()
            removeIfEmpty(list)
        })
    } else {
        const first = lines[0]
        if (first.tagName === 'LI') splitListBefore(first)
        const anchor = topLevelBlock(editor, first)
        const list = makeList(kind)
        editor.insertBefore(list, anchor)
        lines.forEach(line => {
            if (line.tagName === 'LI') {
                const oldList = line.parentElement
                if (kind !== 'checklist') delete line.dataset.checked
                list.appendChild(line)
                removeIfEmpty(oldList)
            } else {
                const li = document.createElement('li')
                replace(line, li)
                list.appendChild(li)
                line.remove()
            }
        })
    }

    normalizeEditor(editor)
    try {
        const restored = document.createRange()
        restored.setStart(replaced.get(saved.sc) ?? saved.sc, saved.so)
        restored.setEnd(replaced.get(saved.ec) ?? saved.ec, saved.eo)
        selection.removeAllRanges()
        selection.addRange(restored)
    } catch {
        // выделение не восстановилось — курсор останется, где его оставил браузер
    }
}

/** Клик по квадратику пункта чек-листа. Возвращает true, если пункт переключён */
export const toggleChecklistItem = (editor: HTMLElement, event: MouseEvent) => {
    const target = event.target as HTMLElement
    const li = target.closest('li')
    const list = li?.parentElement
    if (!li || !list || !editor.contains(li) || list.dataset.type !== 'checklist') return false
    const box = li.getBoundingClientRect()
    if (event.clientX - box.left > 26) return false
    if (li.dataset.checked === 'true') delete li.dataset.checked
    else li.dataset.checked = 'true'
    return true
}

/** После Enter новый пункт чек-листа наследует отметку — снимаем её с пустых пунктов */
export const resetEmptyCheckedItems = (editor: HTMLElement) => {
    editor.querySelectorAll<HTMLElement>('ul[data-type="checklist"] > li[data-checked]').forEach(li => {
        if (!li.textContent?.trim()) delete li.dataset.checked
    })
}

/* ===== Перемещение фото ===== */

export interface DropTarget {
    /** Перед каким блоком вставить фото (null — в конец) */
    before: Element | null
    /** Вертикальная координата линии-подсказки относительно окна */
    lineY: number
    align: FigureAlign
}

export const findDropTarget = (
    editor: HTMLElement,
    figure: HTMLElement,
    clientX: number,
    clientY: number,
): DropTarget => {
    const blocks = Array.from(editor.children).filter(el => el !== figure)
    const editorBox = editor.getBoundingClientRect()
    const align: FigureAlign = clientX < editorBox.left + editorBox.width / 2 ? 'left' : 'right'
    for (const block of blocks) {
        const box = block.getBoundingClientRect()
        if (clientY < box.top + box.height / 2) {
            return { before: block, lineY: box.top, align }
        }
    }
    const last = blocks[blocks.length - 1]
    return {
        before: null,
        lineY: last ? last.getBoundingClientRect().bottom : editorBox.top,
        align,
    }
}

export const moveFigure = (editor: HTMLElement, figure: HTMLElement, target: DropTarget) => {
    figure.dataset.align = target.align
    if (target.before !== figure) editor.insertBefore(figure, target.before)
    normalizeEditor(editor)
}
