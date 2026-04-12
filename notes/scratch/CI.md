mode: description: Failure mode required: true default: report type: choice options: - report < this is not
needed tbh > - abort_on_error check_mode: description: Check routine mode required: true default: check type:
choice options: - fix - check - skip run_install: < this should always install. ??> description: Run install
diagnostics required: true default: true type: boolean require_lockfile: description: Treat frozen lockfile
install as required required: true default: false type: boolean require_clean_repo: description: Fail if
repository becomes dirty  
 required: true default: false type: boolean run_build: description: Run pnpm build required: true default:
false type: boolean run_test: description: Run pnpm test required: true default: false type: boolean
run_docs_build: description: Run docs build routine required: true default: false type: boolean
nx_cache_reset: description: Run nx cache reset before routines required: true default: false type: boolean
pnpm_cache_reset: description: Run pnpm store prune before routines required: true default: false type:
boolean

ok so then the cmd tha \- - build noy on main: reqiure lockfile = false

    main and release candidate
    - mode require lint = true, mode check
    - require clean repo


    autofix  and or build docs

=- commit changes =true mode check

fix would be : mode=fix commit=true

docs = mode=fix run docs, commit true

- if it returns the scope - and maybe some report of affected then i think only the changeset and release
  actions would need anything added on.
