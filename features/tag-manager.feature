Feature: Manage tags and allergens across the collection
  As someone tidying an imported collection
  I want to rename, merge and delete tags and allergens in one place
  So that misspelt or near-duplicate labels are combined into one clean set

  Background:
    Given the collection has:
      | id | tags               | allergens   |
      | r1 | speedy, veggie     | gluten      |
      | r2 | vegetarian, speedy | egg, gluten |
      | r3 | veggie             |             |

  Scenario: Renaming a tag rewrites every recipe that carries it
    When I rename the tag "speedy" to "quick"
    Then tag "quick" is used by 2 recipes
    And tag "speedy" is used by 0 recipes

  Scenario: Merging two spellings collapses them into one
    When I merge the tags "veggie, vegetarian" into "vegetarian"
    Then tag "vegetarian" is used by 3 recipes
    And tag "veggie" is used by 0 recipes

  Scenario: Deleting a tag removes it from every recipe
    When I delete the tag "speedy"
    Then tag "speedy" is used by 0 recipes

  Scenario: Allergens are managed the same way
    When I merge the allergens "egg, gluten" into "gluten"
    Then allergen "gluten" is used by 2 recipes
    And allergen "egg" is used by 0 recipes
