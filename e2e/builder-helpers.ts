import {expect,type Page} from '@playwright/test'
export async function chooseBuilderExercise(page:Page,name:string){
 await page.getByRole('searchbox',{name:'Buscar ejercicio',exact:true}).fill(name)
 await page.getByRole('button',{name,exact:true}).click()
 await expect(page.locator('[data-draft-ready=true]')).toBeVisible()
}
export async function configureBuilderDay(page:Page,names:string[]){
 for(const name of names)await chooseBuilderExercise(page,name)
 await page.getByRole('button',{name:'Continuar',exact:true}).click()
}
export async function saveBuilderDay(page:Page){await page.getByRole('button',{name:'Guardar día',exact:true}).click();await expect(page.locator('.builder-preview')).toBeVisible()}
export async function saveBuilderRoutine(page:Page){await page.getByRole('button',{name:'Crear rutina',exact:true}).click();await expect(page).toHaveURL(/rutinas\?tab=mis/)}
