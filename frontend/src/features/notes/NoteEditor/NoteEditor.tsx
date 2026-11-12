import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useRef,
    useState,
} from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '@/stores'
import type { Note } from '@/types'
import { notesApi } from '@/api/notes'
import { createNoteTag, saveNote } from '@/stores/notes/notesActions'
import { NoteTagsField } from '@/features/notes/NoteTagsField/NoteTagsField'
import { formatDateTime, parseApiError } from '@/utils'
import {
    createFigure,
    currentListKind,
    findDropTarget,
    hydrateEditor,
    insertFigure,
    isEditorEmpty,
    moveFigure,
    resetEmptyCheckedItems,
    toggleChecklistItem,
    toggleList,
    type DropTarget,
    type FigureAlign,
    type FigureSize,
    type ListKind,
} from './editorDom'
import listBulletedIcon from '@/assets/icons/list-bulleted.svg'
import listNumberedIcon from '@/assets/icons/list-numbered.svg'
import listCheckIcon from '@/assets/icons/list-check.svg'
import imageIcon from '@/assets/icons/image.svg'
import dragIcon from '@/assets/icons/drag.svg'
import alignLeftIcon from '@/assets/icons/align-left.svg'
import alignRightIcon from '@/assets/icons/align-right.svg'
import trashIcon from '@/assets/icons/trash.svg'
import './NoteEditor.scss'

const AUTOSAVE_DELAY = 800
const DRAG_THRESHOLD = 5

type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

const SAVE_LABELS: Record<SaveState, string> = {
    saved: 'Сохранено',
    dirty: 'Есть изменения',
    saving: 'Сохранение…',
    error: 'Не удалось сохранить',
}

const LISTS: { kind: ListKind; icon: string; label: string }[] = [
    { kind: 'bulleted', icon: listBulletedIcon, label: 'Маркированный список' },
    { kind: 'numbered', icon: listNumberedIcon, label: 'Нумерованный список' },
    { kind: 'checklist', icon: listCheckIcon, label: 'Список с чекбоксами' },
]

const SIZES: { size: FigureSize; label: string }[] = [
    { size: 's', label: 'S' },
    { size: 'm', label: 'M' },
    { size: 'l', label: 'L' },
]

interface Formats {
    bold: boolean
    italic: boolean
    underline: boolean
    list: ListKind | null
}

const NO_FORMATS: Formats = { bold: false, italic: false, underline: false, list: null }

interface Box {
    top: number
    left: number
    width: number
}

export interface NoteEditorHandle {
    /** Дождаться сохранения всех изменений */
    flush: () => Promise<void>
    /** Пустая заметка: без названия, текста, фото и тегов */
    isEmpty: () => boolean
    /** Забыть несохранённые изменения (заметку удаляют) */
    discard: () => void
}

interface NoteEditorProps {
    noteId: number
    onDelete: () => void
    onBack: () => void
}

export const NoteEditor = forwardRef<NoteEditorHandle, NoteEditorProps>(({ noteId, onDelete, onBack }, ref) => {
    const dispatch = useDispatch<AppDispatch>()
    const allTags = useSelector((state: RootState) => state.notes.tags)

    const [note, setNote] = useState<Note | null>(null)
    const [loadError, setLoadError] = useState('')
    const [title, setTitle] = useState('')
    const [tagIds, setTagIds] = useState<number[]>([])
    const [updatedAt, setUpdatedAt] = useState('')
    const [saveState, setSaveState] = useState<SaveState>('saved')
    const [formats, setFormats] = useState<Formats>(NO_FORMATS)
    const [activeFigure, setActiveFigure] = useState<HTMLElement | null>(null)
    const [figureBox, setFigureBox] = useState<Box | null>(null)
    const [dropLine, setDropLine] = useState<(Box & { align: FigureAlign }) | null>(null)
    const [layoutTick, setLayoutTick] = useState(0)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadError, setUploadError] = useState('')
    const [isBlank, setIsBlank] = useState(false)

    const wrapperRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const titleInputRef = useRef<HTMLInputElement>(null)
    const rangeRef = useRef<Range | null>(null)
    // Последние значения для автосохранения: оно срабатывает и после размонтирования
    const titleRef = useRef('')
    const tagIdsRef = useRef<number[]>([])
    const contentRef = useRef('')
    const dirtyRef = useRef(false)
    const timerRef = useRef<number | undefined>(undefined)
    const savingRef = useRef<Promise<void> | null>(null)

    const bumpLayout = () => setLayoutTick(tick => tick + 1)

    /* ===== Загрузка ===== */

    useEffect(() => {
        let cancelled = false
        notesApi.getNote(noteId)
            .then(({ data }) => {
                if (cancelled) return
                setNote(data)
                setTitle(data.title)
                setTagIds(data.tags.map(tag => tag.id))
                setUpdatedAt(data.updated_at)
                titleRef.current = data.title
                tagIdsRef.current = data.tags.map(tag => tag.id)
                contentRef.current = data.content
            })
            .catch(e => !cancelled && setLoadError(
                e?.response?.status === 404 ? 'Заметка не найдена' : parseApiError(e)))
        return () => {
            cancelled = true
        }
    }, [noteId])

    useLayoutEffect(() => {
        if (!note || !editorRef.current) return
        hydrateEditor(editorRef.current, note.content, note.images)
        setIsBlank(isEditorEmpty(editorRef.current))
        // Абзацы — <p>, форматирование — теги <b>/<i>/<u>, а не inline-стили
        document.execCommand('defaultParagraphSeparator', false, 'p')
        document.execCommand('styleWithCSS', false, 'false')
        // Новую заметку сразу можно печатать
        if (!note.title && isEditorEmpty(editorRef.current)) {
            titleInputRef.current?.focus()
        }
    }, [note])

    /* ===== Автосохранение ===== */

    const doSave = useCallback(async () => {
        dirtyRef.current = false
        setSaveState('saving')
        try {
            const saved = await dispatch(saveNote(noteId, {
                title: titleRef.current.trim(),
                content: contentRef.current,
                tag_ids: tagIdsRef.current,
            }))
            setUpdatedAt(saved.updated_at)
            if (!dirtyRef.current) setSaveState('saved')
        } catch {
            dirtyRef.current = true
            setSaveState('error')
        }
    }, [dispatch, noteId])

    const flush = useCallback(async () => {
        window.clearTimeout(timerRef.current)
        while (savingRef.current) await savingRef.current
        if (!dirtyRef.current) return
        savingRef.current = doSave().finally(() => {
            savingRef.current = null
        })
        await savingRef.current
    }, [doSave])

    const markDirty = useCallback(() => {
        if (editorRef.current) {
            contentRef.current = editorRef.current.innerHTML
            setIsBlank(isEditorEmpty(editorRef.current))
        }
        dirtyRef.current = true
        setSaveState('dirty')
        window.clearTimeout(timerRef.current)
        timerRef.current = window.setTimeout(flush, AUTOSAVE_DELAY)
    }, [flush])

    useImperativeHandle(ref, () => ({
        flush,
        isEmpty: () =>
            !titleRef.current.trim() && !tagIdsRef.current.length && isEditorEmpty(editorRef.current),
        discard: () => {
            window.clearTimeout(timerRef.current)
            dirtyRef.current = false
        },
    }), [flush])

    // Уходим со страницы или на другую заметку — сохраняем, что не успели
    useEffect(() => () => {
        flush()
    }, [flush])

    /* ===== Форматирование ===== */

    const updateFormats = useCallback(() => {
        const editor = editorRef.current
        const selection = window.getSelection()
        if (!editor || !selection?.rangeCount || !editor.contains(selection.anchorNode)) return
        rangeRef.current = selection.getRangeAt(0).cloneRange()
        setFormats({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            list: currentListKind(editor),
        })
    }, [])

    useEffect(() => {
        document.addEventListener('selectionchange', updateFormats)
        return () => document.removeEventListener('selectionchange', updateFormats)
    }, [updateFormats])

    /** Вернуть курсор в текст, если фокус ушёл на кнопку или в заголовок */
    const focusEditor = () => {
        const editor = editorRef.current
        if (!editor) return
        const selection = window.getSelection()
        if (selection && editor.contains(selection.anchorNode)) return
        editor.focus()
        const range = rangeRef.current ?? (() => {
            const end = document.createRange()
            end.selectNodeContents(editor.lastElementChild ?? editor)
            end.collapse(false)
            return end
        })()
        selection?.removeAllRanges()
        selection?.addRange(range)
    }

    const runCommand = (command: 'bold' | 'italic' | 'underline') => {
        focusEditor()
        document.execCommand(command)
        markDirty()
        updateFormats()
    }

    const runList = (kind: ListKind) => {
        const editor = editorRef.current
        if (!editor) return
        focusEditor()
        toggleList(editor, kind)
        markDirty()
        updateFormats()
    }

    /* ===== Фото ===== */

    const uploadFiles = async (files: File[]) => {
        const editor = editorRef.current
        const images = files.filter(file => file.type.startsWith('image/'))
        if (!editor || !images.length) return
        setIsUploading(true)
        setUploadError('')
        try {
            for (const file of images) {
                const { data } = await notesApi.uploadImage(noteId, file)
                const figure = createFigure(data)
                insertFigure(editor, figure, rangeRef.current)
                setActiveFigure(figure)
                markDirty()
            }
        } catch (e) {
            setUploadError(parseApiError(e))
        } finally {
            setIsUploading(false)
        }
    }

    const updateFigure = (patch: { align?: FigureAlign; size?: FigureSize }) => {
        if (!activeFigure) return
        if (patch.align) activeFigure.dataset.align = patch.align
        if (patch.size) activeFigure.dataset.size = patch.size
        markDirty()
        bumpLayout()
    }

    const deleteFigure = () => {
        if (!activeFigure) return
        activeFigure.remove()
        setActiveFigure(null)
        markDirty()
    }

    // Подсветка выбранного фото
    useEffect(() => {
        if (!activeFigure) return
        activeFigure.classList.add('is-active')
        return () => activeFigure.classList.remove('is-active')
    }, [activeFigure])

    // Панель фото повторяет положение фигуры
    useLayoutEffect(() => {
        const wrapper = wrapperRef.current
        if (!activeFigure || !wrapper || !wrapper.contains(activeFigure)) {
            setFigureBox(null)
            return
        }
        const outer = wrapper.getBoundingClientRect()
        const box = activeFigure.getBoundingClientRect()
        setFigureBox({ top: box.top - outer.top, left: box.left - outer.left, width: box.width })
    }, [activeFigure, layoutTick])

    useEffect(() => {
        window.addEventListener('resize', bumpLayout)
        return () => window.removeEventListener('resize', bumpLayout)
    }, [])

    /** Перетаскивание фото: за картинку или за ручку на панели */
    const startFigureDrag = (event: React.PointerEvent, figure: HTMLElement) => {
        const editor = editorRef.current
        const wrapper = wrapperRef.current
        if (!editor || !wrapper || event.button !== 0) return
        event.preventDefault()
        const startX = event.clientX
        const startY = event.clientY
        let dragging = false
        let target: DropTarget | null = null

        const onMove = (e: PointerEvent) => {
            if (!dragging && Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD) return
            dragging = true
            figure.classList.add('is-dragging')
            target = findDropTarget(editor, figure, e.clientX, e.clientY)
            const outer = wrapper.getBoundingClientRect()
            const inner = editor.getBoundingClientRect()
            setDropLine({
                top: target.lineY - outer.top,
                left: inner.left - outer.left,
                width: inner.width,
                align: target.align,
            })
        }

        const onUp = () => {
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
            window.removeEventListener('pointercancel', onUp)
            figure.classList.remove('is-dragging')
            setDropLine(null)
            if (dragging && target) {
                moveFigure(editor, figure, target)
                markDirty()
            }
            setActiveFigure(figure)
            bumpLayout()
        }

        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        window.addEventListener('pointercancel', onUp)
    }

    /* ===== События редактора ===== */

    const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
        const editor = editorRef.current
        if (!editor) return
        if ((event.nativeEvent as InputEvent).inputType === 'insertParagraph') {
            resetEmptyCheckedItems(editor)
        }
        // Пустая подпись — без <br>, чтобы показать подсказку
        editor.querySelectorAll('figcaption').forEach(caption => {
            if (!caption.textContent) caption.innerHTML = ''
        })
        if (activeFigure && !editor.contains(activeFigure)) setActiveFigure(null)
        markDirty()
        bumpLayout()
    }

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        const editor = editorRef.current
        if (!editor) return
        if (toggleChecklistItem(editor, event.nativeEvent)) {
            event.preventDefault()
            markDirty()
            return
        }
        const figure = (event.target as HTMLElement).closest('figure')
        setActiveFigure(figure && editor.contains(figure) ? figure : null)
    }

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement
        const figure = target.closest('figure')
        if (target.tagName === 'IMG' && figure && event.pointerType === 'mouse') {
            startFigureDrag(event, figure)
        }
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement
        if (event.key === 'Enter' && target.closest('figcaption')) {
            event.preventDefault()
            return
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault()
            flush()
        }
    }

    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
        event.preventDefault()
        const files = Array.from(event.clipboardData.files)
        if (files.some(file => file.type.startsWith('image/'))) {
            if (!(event.target as HTMLElement).closest('figcaption')) uploadFiles(files)
            return
        }
        // Вставляем только текст: чужие шрифты и стили в заметку не попадают
        const text = event.clipboardData.getData('text/plain')
        if (text) document.execCommand('insertText', false, text)
    }

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        if (!event.dataTransfer.files.length) return
        event.preventDefault()
        const range = document.caretRangeFromPoint?.(event.clientX, event.clientY)
        if (range) rangeRef.current = range
        uploadFiles(Array.from(event.dataTransfer.files))
    }

    /* ===== Заголовок и теги ===== */

    const changeTitle = (value: string) => {
        setTitle(value)
        titleRef.current = value
        markDirty()
    }

    const changeTags = (ids: number[]) => {
        setTagIds(ids)
        tagIdsRef.current = ids
        markDirty()
    }

    const handleCreateTag = (tagTitle: string) =>
        dispatch(createNoteTag(tagTitle))

    /* ===== Разметка ===== */

    if (loadError) {
        return (
            <div className="note-editor note-editor--message">
                <p className="note-editor__error">{loadError}</p>
                <button type="button" className="note-editor__back" onClick={onBack}>‹ К списку</button>
            </div>
        )
    }

    if (!note) {
        return <div className="note-editor note-editor--message">Загрузка заметки…</div>
    }

    const activeAlign = activeFigure?.dataset.align as FigureAlign | undefined
    const activeSize = activeFigure?.dataset.size as FigureSize | undefined

    return (
        <div className="note-editor">
            <header className="note-editor__header">
                <button type="button" className="note-editor__back" onClick={onBack}>‹ К списку</button>
                <input
                    ref={titleInputRef}
                    className="note-editor__title"
                    placeholder="Без названия"
                    value={title}
                    maxLength={200}
                    onChange={(e) => changeTitle(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault()
                            editorRef.current?.focus()
                        }
                    }}
                    aria-label="Название заметки"
                />
                <button
                    type="button"
                    className="note-editor__delete"
                    onClick={onDelete}
                    title="Удалить заметку"
                    aria-label="Удалить заметку"
                >
                    <img src={trashIcon} alt="" />
                </button>
            </header>

            <div className="note-editor__meta">
                <NoteTagsField
                    tags={allTags}
                    selectedIds={tagIds}
                    onChange={changeTags}
                    onCreate={handleCreateTag}
                />
                <span className={`note-editor__status note-editor__status--${saveState}`}>
                    {saveState === 'saved' && updatedAt
                        ? `Сохранено ${formatDateTime(updatedAt)}`
                        : SAVE_LABELS[saveState]}
                </span>
            </div>

            <div className="note-editor__toolbar" role="toolbar" aria-label="Форматирование">
                {([
                    ['bold', 'Ж', 'Жирный (Ctrl+B)'],
                    ['italic', 'К', 'Курсив (Ctrl+I)'],
                    ['underline', 'Ч', 'Подчёркнутый (Ctrl+U)'],
                ] as const).map(([command, letter, label]) => (
                    <button
                        key={command}
                        type="button"
                        className={`note-editor__tool note-editor__tool--${command} ${formats[command] ? 'note-editor__tool--active' : ''}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => runCommand(command)}
                        title={label}
                        aria-label={label}
                        aria-pressed={formats[command]}
                    >
                        {letter}
                    </button>
                ))}

                <span className="note-editor__separator" />

                {LISTS.map(({ kind, icon, label }) => (
                    <button
                        key={kind}
                        type="button"
                        className={`note-editor__tool ${formats.list === kind ? 'note-editor__tool--active' : ''}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => runList(kind)}
                        title={label}
                        aria-label={label}
                        aria-pressed={formats.list === kind}
                    >
                        <img src={icon} alt="" />
                    </button>
                ))}

                <span className="note-editor__separator" />

                <button
                    type="button"
                    className="note-editor__tool note-editor__tool--photo"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    title="Добавить фото"
                >
                    <img src={imageIcon} alt="" />
                    <span>{isUploading ? 'Загрузка…' : 'Фото'}</span>
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => {
                        uploadFiles(Array.from(e.target.files ?? []))
                        e.target.value = ''
                    }}
                />
            </div>

            {uploadError && <p className="note-editor__error">{uploadError}</p>}

            <div className="note-editor__body" ref={wrapperRef}>
                <div
                    ref={editorRef}
                    className={`note-editor__content ${isBlank ? 'note-editor__content--blank' : ''}`}
                    contentEditable
                    suppressContentEditableWarning
                    role="textbox"
                    aria-multiline="true"
                    aria-label="Текст заметки"
                    data-placeholder="Начните писать…"
                    onInput={handleInput}
                    onClick={handleClick}
                    onPointerDown={handlePointerDown}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.dataTransfer.types.includes('Files') && e.preventDefault()}
                />

                {activeFigure && figureBox && !dropLine && (
                    <div
                        className="note-figure-panel"
                        style={{
                            top: figureBox.top + 8,
                            ...(activeAlign === 'left'
                                ? { left: figureBox.left + 8 }
                                : { right: (wrapperRef.current?.clientWidth ?? 0) - figureBox.left - figureBox.width + 8 }),
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <button
                            type="button"
                            className="note-figure-panel__btn note-figure-panel__btn--drag"
                            onPointerDown={(e) => startFigureDrag(e, activeFigure)}
                            title="Перетащите, чтобы переместить фото"
                            aria-label="Переместить фото"
                        >
                            <img src={dragIcon} alt="" />
                        </button>
                        <span className="note-figure-panel__separator" />
                        <button
                            type="button"
                            className={`note-figure-panel__btn ${activeAlign === 'left' ? 'note-figure-panel__btn--active' : ''}`}
                            onClick={() => updateFigure({ align: 'left' })}
                            title="Слева, текст справа"
                            aria-label="Фото слева"
                        >
                            <img src={alignLeftIcon} alt="" />
                        </button>
                        <button
                            type="button"
                            className={`note-figure-panel__btn ${activeAlign === 'right' ? 'note-figure-panel__btn--active' : ''}`}
                            onClick={() => updateFigure({ align: 'right' })}
                            title="Справа, текст слева"
                            aria-label="Фото справа"
                        >
                            <img src={alignRightIcon} alt="" />
                        </button>
                        <span className="note-figure-panel__separator" />
                        {SIZES.map(({ size, label }) => (
                            <button
                                key={size}
                                type="button"
                                className={`note-figure-panel__btn note-figure-panel__btn--text ${activeSize === size ? 'note-figure-panel__btn--active' : ''}`}
                                onClick={() => updateFigure({ size })}
                                title="Размер фото"
                            >
                                {label}
                            </button>
                        ))}
                        <span className="note-figure-panel__separator" />
                        <button
                            type="button"
                            className="note-figure-panel__btn note-figure-panel__btn--danger"
                            onClick={deleteFigure}
                            title="Удалить фото"
                            aria-label="Удалить фото"
                        >
                            <img src={trashIcon} alt="" />
                        </button>
                    </div>
                )}

                {dropLine && (
                    <div
                        className={`note-drop-line note-drop-line--${dropLine.align}`}
                        style={{ top: dropLine.top, left: dropLine.left, width: dropLine.width }}
                    />
                )}
            </div>
        </div>
    )
})

NoteEditor.displayName = 'NoteEditor'
